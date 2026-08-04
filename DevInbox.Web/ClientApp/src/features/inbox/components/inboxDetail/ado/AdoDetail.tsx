import { InboxItemDetail } from "@api";
import Box from "@mui/material/Box";
import InboxDetailHeader from "../InboxDetailHeader";

interface IAdoDetail {
    details: InboxItemDetail;
}
const AdoDetail = ({ details }: IAdoDetail) => {
    return (
        <Box
            data-testid="ado-detail"
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
            }}
        >
            <InboxDetailHeader
                details={details}
                url={details.ado?.url}
            />
            <Box
                sx={{
                    flex: 1,
                    overflow: "auto",
                    px: { xs: 2, md: 3 },
                    py: 2,
                }}
            >
                ADO DETAIL
            </Box>
        </Box>
    );
};

export default AdoDetail;