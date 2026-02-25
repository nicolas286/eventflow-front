import { useMemo } from "react";
import { supabase } from "../../../../gateways/supabase/supabaseClient";

import "../../../../styles/desktop/admin/adminSingleEvent.tickets.desktop.css";
import "../../../../styles/mobile/admin/adminSingleEvent.tickets.mobile.css";

import { EventTicketsPanel } from "../../../../features/admin/events/singleEvent/EventTicketsPanel/EventTicketsPanel";
import { useCreateEventProduct } from "../../../../features/admin/hooks/useCreateEventProduct";
import { useDeleteEventProduct } from "../../../../features/admin/hooks/useDeleteEventProduct";
import { useUpdateEventProduct } from "../../../../features/admin/hooks/useUpdateEventProduct";
import type { AdminEventDetailEvent, EventDetailAdmin } from "../../../../domain/models/admin/admin.eventDetail.schema";
import { toRows } from "../../../../domain/helpers/normalize";

export function SingleEventTicketsSection(props: {
  orgId: string;
  event: AdminEventDetailEvent;
  data: EventDetailAdmin;
  onChanged: () => Promise<void>;
}) {
  const { orgId, event, data, onChanged } = props;

  const createProduct = useCreateEventProduct({ supabase });
  const updateProduct = useUpdateEventProduct({ supabase });
  const removeProduct = useDeleteEventProduct({ supabase });

  const products = useMemo(() => toRows(data.products), [data.products]);
  const orders = useMemo(() => toRows(data.orders), [data.orders]);
  const orderItems = useMemo(
    () => toRows(data.orderItems),
    [data.orderItems]
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
