import { InboxItemSummary, IntegrationType, ItemSource } from "@api";
import ListItemIcon from "@mui/material/ListItemIcon";
import IntegrationIcon from "@shared/components/integrationIcon/IntegrationIcon";
import { useMemo } from "react";

interface IInboxItemIcon {
    item: InboxItemSummary;
}

const InboxItemIcon = ({ item }: IInboxItemIcon) => {

    const integration = useMemo(() => {
        switch (item.sourceType) {
            case ItemSource.Ado:
                return IntegrationType.Ado;
            case ItemSource.Github:
                return IntegrationType.Github;
            case ItemSource.Note:
                return "note";
            default:
                return "";
        }
    }
    , [item.sourceType]);

    return (
        <ListItemIcon
            sx={{
                minWidth: 36,
                mt: 0.25,
            }}
        >
            <IntegrationIcon
                integration={integration}
                size={16}
            />
        </ListItemIcon>
    );
};

export default InboxItemIcon;