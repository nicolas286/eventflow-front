import "../../styles/ticketRow.css"
import { Button, Input } from "../../../ui/components";
import { toNumberOrZero } from "../../../domain/helpers/number";

type Ticket = {
  name: string;
  price: number;
  remaining: number;
};

type TicketRowProps = {
  ticket: Ticket;
  canDelete: boolean;
  onChange: (patch: Partial<Ticket>) => void;
  onDelete: () => void;
};

export default function TicketRow({ ticket, canDelete, onChange, onDelete }: TicketRowProps) {
  return (
    <div className="ticketRow">
      <Input value={ticket.name} onChange={(e) => onChange({ name: e.target.value })} />
      <Input type="number" value={ticket.price} onChange={(e) => onChange({ price: toNumberOrZero(e.target.value) })} />
      <Input type="number" value={ticket.remaining} onChange={(e) => onChange({ remaining: toNumberOrZero(e.target.value) })} />
      <Button variant="danger" disabled={!canDelete} label="Supprimer" onClick={onDelete} />
    </div>
  );
}