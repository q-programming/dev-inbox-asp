import { InboxItemSummary, InboxReason, Priority } from "@api";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useMemo } from "react";

interface IInboxItemBadges {
    item: InboxItemSummary;
}

const InboxItemBadges: React.FC<IInboxItemBadges> = ({ item }) => {

    const ReasonChip = useMemo(() => {
        const translateReason = (): string => {
            switch (item.reason) {
                case InboxReason.Assigned:
                    return "Assigned to me";
                case InboxReason.Mentioned:
                    return "Mentioned";
                case InboxReason.ReviewRequested:
                    return "Review requested";
                case InboxReason.Authored:
                    return "Authored by me";
                case InboxReason.FollowUp:
                    return "Follow up";
                case InboxReason.Note:
                    return "Note";
                default:
                    return ""
            }
        };
        if(!item.reason || item.reason === InboxReason.Unknown) {
            return null;
        }
        else {
            return (
                <Chip
                    size="small"
                    label={translateReason()}
                />
            );
        }
    }, [item.reason]);
    

    return (
        <Stack
            direction="row"
            spacing={0.5}
        >
            {ReasonChip}
            {item.priority && item.priority !== Priority.None && (
                <Chip
                    size="small"
                    color="warning"
                    label={item.priority}
                />
            )}
        </Stack>
    );
};

export default InboxItemBadges;