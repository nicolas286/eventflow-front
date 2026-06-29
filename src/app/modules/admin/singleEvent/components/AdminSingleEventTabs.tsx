import Button from "@ui/components/button/Button";
import type { AdminSingleEventTabKey } from "./TabKeys";


type Props = {
  activeTab: AdminSingleEventTabKey;
  onChange: (tab: AdminSingleEventTabKey) => void;
};

export function AdminSingleEventTabs(props: Props) {
  const { activeTab, onChange } = props;

  return (
    <div className="adminEventTabs">
      <div className="adminEventTabsInner">
        <TabButton active={activeTab === "details"} onClick={() => onChange("details")}>
          Détails
        </TabButton>

        <TabButton active={activeTab === "tickets"} onClick={() => onChange("tickets")}>
          Tickets
        </TabButton>

        <TabButton active={activeTab === "form"} onClick={() => onChange("form")}>
          Formulaire d&apos;inscription
        </TabButton>

        <TabButton active={activeTab === "promoCodes"} onClick={() => onChange("promoCodes")}>
          Codes promo
        </TabButton>

        <TabButton active={activeTab === "participants"} onClick={() => onChange("participants")}>
          Participants
        </TabButton>
      </div>
    </div>
  );
}

function TabButton(props: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { active = false, onClick, children } = props;

  return (
    <Button
      type="button"
      onClick={onClick}
      className={`adminEventTab${active ? " isActive" : ""}`}
    >
      {children}
    </Button>
  );
}