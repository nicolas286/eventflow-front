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
import type { OrdersUI } from "../../orders/schemas/admin.ordersSchema";
import type { OrderItems } from "@shared/models/db/db.orderItems.schema";
import type { PaymentsUI } from "@shared/models/db/db.payment.schema";

import { toRows } from "@helpers/normalize";

export function SingleEventTicketsSection(props: {
  orgId: string;
  event: AdminEventDetailEvent;
  products: EventProducts;
  orders: OrdersUI;
  orderItems: OrderItems;
  payments: PaymentsUI;
  onChanged: () => Promise<void>;
}) {
  const { orgId, event, products, orders, orderItems, payments, onChanged } = props;

  const createProduct = useCreateEventProduct({ supabase });
  const updateProduct = useUpdateEventProduct({ supabase });
  const removeProduct = useDeleteEventProduct({ supabase });

  const productsRows = useMemo(() => toRows(products), [products]);
  const ordersRows = useMemo(() => toRows(orders), [orders]);
  const orderItemsRows = useMemo(() => toRows(orderItems), [orderItems]);
  const paymentsRows = useMemo(() => toRows(payments), [payments]);

  return (
    <div className="adminEventSection adminSingleEventTickets">
      <EventTicketsPanel
        orgId={orgId}
        event={event}
        products={productsRows}
        orders={ordersRows}
        orderItems={orderItemsRows}
        payments={paymentsRows}
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