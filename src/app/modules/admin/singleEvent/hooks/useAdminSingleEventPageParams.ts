import { useSearchParams } from "react-router-dom";
import {
  isAdminSingleEventTabKey,
  type AdminSingleEventTabKey,
} from "../components/TabKeys";

export type ParticipantsTabKey = "participants" | "tickets";

const PARTICIPANTS_TAB_KEYS: ParticipantsTabKey[] = ["participants", "tickets"];

function isParticipantsTabKey(value: string | null): value is ParticipantsTabKey {
  return !!value && (PARTICIPANTS_TAB_KEYS as string[]).includes(value);
}

export function useAdminSingleEventPageParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const rawParticipantsTab = searchParams.get("participantsTab");

  const tab: AdminSingleEventTabKey = isAdminSingleEventTabKey(rawTab)
    ? rawTab
    : "details";

  const participantsTab: ParticipantsTabKey = isParticipantsTabKey(rawParticipantsTab)
    ? rawParticipantsTab
    : "participants";

  const shouldOpenScanner = searchParams.get("openScanner") === "1";

  function setTab(next: AdminSingleEventTabKey) {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set("tab", next);
        return sp;
      },
      { replace: true }
    );
  }

  function consumeScannerFlag() {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.delete("openScanner");
        return sp;
      },
      { replace: true }
    );
  }

  return {
    tab,
    setTab,
    participantsTab,
    shouldOpenScanner,
    consumeScannerFlag,
    searchParams,
  };
}