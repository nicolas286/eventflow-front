import { useMemo } from "react";
import { supabase } from "../../../../gateways/supabase/supabaseClient";

import "../../../../styles/desktop/admin/adminSingleEvent.tickets.desktop.css";
import "../../../../styles/mobile/admin/adminSingleEvent.tickets.mobile.css";

import { EventTicketsPanel } from "../../../../features/admin/events/singleEvent/EventTicketsPanel";
import { useCreateEventProduct } from "../../../../features/admin/hooks/useCreateEventProduct";
import { useDeleteEventProduct } from "../../../../features/admin/hooks/useDeleteEventProduct";
import { useUpdateEventProduct } from "../../../../features/admin/hooks/useUpdateEventProduct";

type AnyRecord = Record<string, any>;

function toRows(value: any): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[];
  if (value && Array.isArray(value.rows)) return value.rows as AnyRecord[];
  return [];
}

export function SingleEventTicketsSection(props: {
  orgId: string;
  event: any;
  data: AnyRecord;
  onChanged: () => Promise<void>;
}) {
  const { orgId, event, data, onChanged } = props;

  const createProduct = useCreateEventProduct({ supabase });
  const updateProduct = useUpdateEventProduct({ supabase });
  const removeProduct = useDeleteEventProduct({ supabase });

  const products = useMemo(() => toRows(data.products), [data.products]);
  const orders = useMemo(() => toRows(data.orders), [data.orders]);
  const orderItems = useMemo(
    () => toRows(data.orderItems ?? data.order_items),
    [data.orderItems, data.order_items]
  );
  const payments = useMemo(() => toRows(data.payments), [data.payments]);

  return (
    <div className="adminEventSection adminSingleEventTickets">
      <EventTicketsPanel
        orgId={orgId}
        event={event}
        products={products}
        orders={orders}
        orderItems={orderItems}
        payments={payments}
        createLoading={createProduct.loading}
        createError={createProduct.error}
        updateLoading={updateProduct.loading}
        deleteLoading={removeProduct.loading}
        deleteError={removeProduct.error}
        // ✅ IMPORTANT: ici on NE refetch PAS à chaque action
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
        // ✅ UN seul refetch, appelé une fois (à la fin du saveAll du panel)
        onChanged={onChanged}
      />
    </div>
  );
}
