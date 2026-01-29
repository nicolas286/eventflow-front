import { useEffect } from "react";
import { applyOrgTheme } from "./applyOrgTheme";

type Props = {
  primaryColor?: string | null; // hex
};

export default function OrgThemeSync({ primaryColor }: Props) {
  useEffect(() => {
    applyOrgTheme(primaryColor ?? "#ad3bad");
  }, [primaryColor]);

  return null;
}
