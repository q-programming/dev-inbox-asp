import { InboxItemDetail } from "@api";
import Box from "@mui/material/Box";
import InboxDetailHeader from "../InboxDetailHeader";

interface INoteDetail {
    details: InboxItemDetail;
}
const NoteDetail = ({ details }: INoteDetail) => {
    return (
        <Box
            data-testid="note-detail"
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
            }}
        >
            <InboxDetailHeader details={details} />
            <Box
                sx={{
                    flex: 1,
                    overflow: "auto",
                    px: { xs: 2, md: 3 },
                    py: 2,
                }}
            >
                NOTE DETAIL
            </Box>
        </Box>
    );
};

export default NoteDetail;