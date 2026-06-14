export async function sendConfirmationEmailForOrderSafe(opts) {
  if (!opts.edgeServiceToken) {
    console.error("[register] EDGE_SERVICE_TOKEN missing -> skip confirmation email");
    return;
  }
  try {
    const { data: claimRows, error: claimErr } = await opts.admin.rpc("claim_order_confirmation_email", {
      p_order_id: opts.orderId
    });
    if (claimErr) {
      console.error("[register] claim_order_confirmation_email failed", claimErr);
      try {
        await opts.admin.rpc("mark_order_confirmation_email_error", {
          p_order_id: opts.orderId,
          p_error: "CLAIM_FAILED"
        });
      } catch  {}
      return;
    }
    const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
    if (!claim?.ok) return;
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 10_000);
    try {
      const res = await fetch(`${opts.functionsBase}/send-confirmation-mail-tickets`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "x-service-token": opts.edgeServiceToken
        },
        body: JSON.stringify({
          templateId: "order_confirmation_v1",
          templateData: {
            orderId: opts.orderId
          }
        }),
        signal: ctrl.signal
      });
      const txt = await res.text().catch(()=>"");
      let j = {};
      try {
        j = txt ? JSON.parse(txt) : {};
      } catch  {
        j = {
          raw: txt.slice(0, 300)
        };
      }
      if (!res.ok || !j?.ok) {
        await opts.admin.rpc("mark_order_confirmation_email_error", {
          p_order_id: opts.orderId,
          p_error: "SEND_FAILED"
        });
        return;
      }
      await opts.admin.rpc("mark_order_confirmation_email_sent", {
        p_order_id: opts.orderId
      });
    } finally{
      clearTimeout(t);
    }
  } catch (e) {
    console.error("[register] send-confirmation-mail exception", e);
    try {
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "SEND_EXCEPTION"
      });
    } catch  {}
  }
}
