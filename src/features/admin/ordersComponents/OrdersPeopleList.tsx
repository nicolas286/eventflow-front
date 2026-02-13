import { Button } from "../../../ui/components";
import { AttendeeEditorPanel } from "../events/singleEvent/AttendeeEditorPanel";
import { toDisplayText, formatDateTime } from "../../../domain/helpers/normalize";
import type { AttendeeUI } from "../../../domain/models/admin/admin.attendeeUI.schema";
import type { ComponentProps } from "react";

type FilledField = { key: string; label: string; value: string };
type Identity = { title: string; subtitle: string };

type AttendeeEditorProps = ComponentProps<typeof AttendeeEditorPanel>;

type OrdersPeopleListProps = {
  groups: Array<[orderId: string, people: AttendeeUI[]]>;
  orderMetaById: Map<string, { orderNumber: string; createdAt?: string }>;
  filledFieldsByAttendeeId: Map<string, FilledField[]>;
  computeIdentity: (attendeeId: string) => Identity;

  isMobile: boolean;

  targetOrderId: string | null;
  deleteOrderLoading: boolean;
  onRequestDeleteOrder: (orderId: string) => void;

  // editor state pour décider si on affiche l'inline editor
  editorOpen: boolean;
  editingAttendeeId: string | null;

  inlineEditorProps: Omit<AttendeeEditorProps, "layout" | "stickyTop" | "editorWidth" | "editorGap" | "left">;
  onOpenEdit: (attendeeId: string, orderId: string) => void;

};

export function OrdersPeopleList(props: OrdersPeopleListProps) {
  const {
    groups,
    orderMetaById,
    filledFieldsByAttendeeId,
    computeIdentity,
    isMobile,
    targetOrderId,
    deleteOrderLoading,
    onRequestDeleteOrder,
    editorOpen,
    editingAttendeeId,
    inlineEditorProps,
    onOpenEdit
  } = props;

  return (
    <div className="adminOrdersGrid">
      {groups.map(([orderId, people]) => {
        const meta = orderMetaById.get(orderId);
        const orderNumber = meta?.orderNumber ?? orderId.slice(0, 8);
        const isDeletingThisOrder = deleteOrderLoading && targetOrderId === orderId;

        return (
          <div key={orderId} className="adminOrderCard">
            <div className="adminOrderHeader">
              <div>
                <div className="adminOrderTitle">Commande {orderNumber}</div>
                <div className="adminOrderSub">Créée le {formatDateTime(meta?.createdAt)}</div>
              </div>

              <div className="adminOrderHeaderRight">
                <span className="adminOrderPill">
                  {people.length} inscrit{people.length > 1 ? "s" : ""}
                </span>

                <Button
                  variant="danger"
                  onClick={() => onRequestDeleteOrder(orderId)}
                  disabled={isDeletingThisOrder}
                >
                  Supprimer la commande
                </Button>
              </div>
            </div>

            <div className="adminOrderPeople">
              {people.map((att) => {
                const identity = computeIdentity(att.id);
                const filled = filledFieldsByAttendeeId.get(att.id) ?? [];
                const showInlineEditor = isMobile && editorOpen && editingAttendeeId === att.id;

                return (
                  <div key={att.id}>
                    <div className="adminPersonCard">
                      <div className="adminPersonTop">
                        <div>
                          <div className="adminPersonName">
                            {identity.title}{" "}
                            <span className="adminPersonIndex">#{att.attendeeIndex}</span>
                          </div>
                          {identity.subtitle ? <div className="adminPersonSub">{identity.subtitle}</div> : null}
                        </div>

                        <div className="adminPersonBadges">
                          <span className={`adminStatusBadge is-${att.status}`}>{att.status}</span>
                          <span className="adminProductBadge">{att.productNameSnapshot}</span>
                        </div>
                      </div>

                      <div className="adminFilledGrid">
                        {filled.length > 0 ? (
                          filled.map((f) => (
                            <div key={f.key} className="adminFieldLine">
                              <span className="adminFieldLabel">{f.label}</span>
                              <span className="adminFieldValue">{toDisplayText(f.value)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="adminFilledEmpty">Aucun champ rempli.</div>
                        )}
                      </div>

                      <div className="adminPersonActionsBottom">
                        <Button variant="secondary" onClick={() => onOpenEdit(att.id, orderId)}>
                            Modifier
                        </Button>
                        </div>

                    </div>

                    {showInlineEditor ? (
                      <div className="adminInlineEditorWrap">
                        <AttendeeEditorPanel {...inlineEditorProps} layout="inline" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
