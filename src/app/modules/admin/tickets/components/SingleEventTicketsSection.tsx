import { useMemo } from "react";
import { supabase } from "@gateways/supabase/supabaseClient";

import "./adminSingleEvent.tickets.desktop.css";
import "./adminSingleEvent.tickets.mobile.css";

import { EventTicketsPanel } from "./EventTicketsPanel/EventTicketsPanel";
import { useCreateEventProduct } from "../../products/hooks/useCreateEventProduct";
import { useDeleteEventProduct } from "../../products/hooks/useDeleteEventProduct";
import { useUpdateEventProduct } from "../../products/hooks/useUpdateEventProduct";

import type { AdminEventDetailEvent } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { EventProducts } from "@shared/models/db/db.eventProducts.schema";

import { toRows } from "@helpers/normalize";

export function SingleEventTicketsSection(props: {
  orgId: string;
  event: AdminEventDetailEvent;
  products: EventProducts;
  onChanged: () => Promise<void>;
}) {
  const { orgId, event, products, onChanged } = props;

  const createProduct = useCreateEventProduct({ supabase });
  const updateProduct = useUpdateEventProduct({ supabase });
  const removeProduct = useDeleteEventProduct({ supabase });

  const productsRows = useMemo(() => toRows(products), [products]);

  return (
    <div className="adminEventSection adminSingleEventTickets">
      <EventTicketsPanel
        orgId={orgId}
        event={event}
        products={productsRows}
        createLoading={createProduct.loading}
        createError={createProduct.error}
        updateLoading={updateProduct.loading}
        deleteLoading={removeProduct.loading}
        deleteError={removeProduct.error}
        onCreate={async (input) => {
          await createProduct.createEventProduct(input);
        }}
        onUpdate={async ({ productId, patch }) => {
          await updateProduct.updateEventProduct({ productId, patch });
        }}
        onRemove={async (productId) => {
          const ok = await removeProduct.deleteEventProduct({ id: productId });
          if (!ok) return;
        }}
        onChanged={onChanged}
      />
    </div>
  );
}