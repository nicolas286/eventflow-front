import { json, handleCorsAndMethod } from "./http.ts";
import { ResponseError } from "./errors.ts";
import { createEdgeLogger, serializeError } from "./logger.ts";

export type EdgeLogger = ReturnType<typeof createEdgeLogger>;

type EdgeContext = {
  logger: EdgeLogger;
};

type EdgeHandler = (
  req: Request,
  ctx: EdgeContext,
) => Promise<Response>;

export function createEdgeHandler(name: string, handler: EdgeHandler) {
  return async (req: Request): Promise<Response> => {
    const logger = createEdgeLogger(name);

    try {
      logger.info("request_received", {
        method: req.method,
        origin: req.headers.get("origin"),
      });

      const methodResponse = handleCorsAndMethod(req, logger);
      if (methodResponse) return methodResponse;

      return await handler(req, { logger });
    } catch (e) {
      if (e instanceof ResponseError) {
        logger.warn("response_error", {
          code: e.code,
          status: e.status,
        });

        return json(
          { error: e.code },
          e.status,
        );
      }

      logger.error("unexpected_error", serializeError(e));

      return json(
        { error: "UNEXPECTED_ERROR" },
        500,
      );
    }
  };
}