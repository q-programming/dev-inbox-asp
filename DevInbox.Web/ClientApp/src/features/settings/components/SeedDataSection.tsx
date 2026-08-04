import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PostAddIcon from '@mui/icons-material/PostAdd';
import Button from "@mui/material/Button";
import { useSeedMutation } from "@feature/inbox/hooks/useInboxQuery";
import useAlertStore, { AlertType } from "@shared/store/alert.store";

/**
 * Data seeder section for development and testing purposes.
 * This section is hidden in production builds and should not be used in live environments.
 * @deprecated
 */
const SeedDataSection = () => {

    const isDev = import.meta.env.DEV;
    const seedData = useSeedMutation();
    const {addAlert} = useAlertStore();
    
    if (!isDev) {
        return null;
    }

    const handleSeedData = async () => {
        seedData.mutate(undefined, {
            onSuccess: () => {
                addAlert({ message: 'Data seeded successfully', type: AlertType.SUCCESS });
            },
            onError: (error) => {
                console.error('Error seeding data:', error);
                addAlert({ message: 'Error seeding data', type: AlertType.ERROR });
            },
        }
        );
    }


    return (<Paper variant="outlined" sx={{ padding: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PostAddIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Data seeder (dev only)
                </Typography>
            </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
            Press to seed with random items
            <Button variant="contained" data-testid="settings-save-btn" onClick={handleSeedData}>
                Seed Data
            </Button>
        </Box>
    </Paper>)
}

export default SeedDataSection;