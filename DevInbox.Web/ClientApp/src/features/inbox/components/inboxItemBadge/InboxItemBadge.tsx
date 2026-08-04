import { InboxItemSummary, InboxReason, Priority } from "@api";
import Chip, { ChipProps } from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useMemo } from "react";
import { REASON_CHIP_COLOR, translateInboxReason } from "@feature/inbox/utils/reason";

interface IInboxItemBadges {
    item: InboxItemSummary;
}

/** Maps a priority level to the chip colour that best conveys its urgency. */
const PRIORITY_COLOR: Partial<Record<Priority, ChipProps["color"]>> = {
    [Priority.Critical]: "error",
    [Priority.High]: "warning",
    [Priority.Medium]: "info",
    [Priority.Low]: "default",
};

const InboxItemBadges: React.FC<IInboxItemBadges> = ({ item }) => {

    const ReasonChip = useMemo(() => {
        if(!item.reason || item.reason === InboxReason.Unknown) {
            return null;
        }
        else {
            return (
                <Chip
                    data-testid="inbox-reason-chip"
                    data-reason={item.reason}
                    size="small"
                    color={REASON_CHIP_COLOR[item.reason] ?? "default"}
                    label={translateInboxReason(item.reason)}
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
                    data-testid="inbox-priority-chip"
                    data-priority={item.priority}
                    size="small"
                    color={PRIORITY_COLOR[item.priority] ?? "default"}
                    label={item.priority}
                />
            )}
        </Stack>
    );
};

export default InboxItemBadges;