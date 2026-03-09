import { useState } from "react";

import { FlexPanel } from "@ui/components/panels/FlexPanel";

import { SingleEventOrdersSubSection } from "./SingleEventOrdersSubSection";
import { SingleEventTicketsSubSection } from "./SingleEventTicketsSubSection";

import type { AdminEventDetailEvent } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";
import type { EventProducts } from "@shared/models/db/db.eventProducts.schema";
import type { AttendeesPage } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { AttendeesAnswers } from "@shared/models/db/db.attendeeAnswers.schema";
import type { OrdersUI } from "../schemas/admin.ordersSchema";

import "./attendees.css";
import type { OrderItem } from "@shared/models/db/db.orderItems.schema";

type SubView = "orders" | "tickets";

export function SingleEventParticipantsSection(props: {
  event: AdminEventDetailEvent;
  products: EventProducts;
  formFields: EventFormField[];
  orders: OrdersUI;
  orderItems: OrderItem[]
  attendees: AttendeesPage;
  attendeeAnswers: AttendeesAnswers;
  onChanged?: () => Promise<void>;
}) {
  const {
    event,
    products,
    formFields,
    orders,
    orderItems,
    attendees,
    attendeeAnswers,
    onChanged,
  } = props;

  const [subView, setSubView] = useState<SubView>("orders");

  return (
    <FlexPanel>
      <div className="adminParticipantsCard">
        <div className="adminParticipantsHeader">
          <div>
            <h3 className="adminParticipantsTitle">Participants</h3>
            <div className="adminParticipantsHint">
              Gérez les commandes et les tickets de l’événement
            </div>
          </div>
        </div>

        <div className="adminSubtabs" role="tablist" aria-label="Sous-vues participants">
          <button
            type="button"
            role="tab"
            aria-selected={subView === "orders"}
            className={subView === "orders" ? "adminSubtab isActive" : "adminSubtab"}
            onClick={() => setSubView("orders")}
          >
            Commandes
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subView === "tickets"}
            className={subView === "tickets" ? "adminSubtab isActive" : "adminSubtab"}
            onClick={() => setSubView("tickets")}
          >
            Tickets
          </button>
        </div>

        {subView === "orders" ? (
          <SingleEventOrdersSubSection
            event={event}
            products={products}
            formFields={formFields}
            orders={orders}
            orderItems={orderItems}
            attendees={attendees}
            attendeeAnswers={attendeeAnswers}
            onChanged={onChanged}
          />
        ) : (
          <SingleEventTicketsSubSection
            eventId={event.id ?? ""}
            eventTitle={event.title ?? "Événement"}
            onChanged={onChanged}
          />
        )}
      </div>
    </FlexPanel>
  );
}