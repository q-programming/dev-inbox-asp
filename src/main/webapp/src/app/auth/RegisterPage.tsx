import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GitHubIcon from '@mui/icons-material/GitHub';
import Divider from '@mui/material/Divider';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { useRegisterMutation } from '@shared/hooks/useAuthQuery';
import { AppRoute } from '@app/routes';
import Footer from '@shared/components/Footer';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { status } = useUserStore();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  if (status === AuthStatus.AUTHENTICATED) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data, {
      onSuccess: () => navigate(AppRoute.LOGIN),
    });
  };

  return (
    <Box
      data-testid="register-page"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 6,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }} color="text.primary">
            Create account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Start managing your developer workflows today.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{ width: '100%', maxWidth: 400, padding: 4, border: 1, borderColor: 'divider' }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  data-testid="register-firstName"
                  id="firstName"
                  label="First name"
                  type="text"
                  autoComplete="given-name"
                  fullWidth
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  {...register('firstName')}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  data-testid="register-lastName"
                  id="lastName"
                  label="Last name"
                  type="text"
                  autoComplete="family-name"
                  fullWidth
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  {...register('lastName')}
                />
              </Grid>
            </Grid>

            <TextField
              data-testid="register-email"
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email')}
            />

            <TextField
              data-testid="register-password"
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
            />

            {registerMutation.isError && (
              <Typography variant="caption" color="error" data-testid="register-error">
                Registration failed. Please try again.
              </Typography>
            )}

            <Button
              data-testid="register-submit"
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={registerMutation.isPending}
              endIcon={<PersonAddIcon />}
              sx={{ mt: 1 }}
            >
              {registerMutation.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled">
              or
            </Typography>
          </Divider>

          <Button
            component="a"
            href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/oauth2/authorization/github`}
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<GitHubIcon />}
            color="inherit"
          >
            Continue with GitHub
          </Button>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Already have an account?{' '}
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(AppRoute.LOGIN)}
            sx={{ fontWeight: 700 }}
          >
            Sign in
          </Link>
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 4 }}>
          {(['Privacy Policy', 'Terms of Service'] as const).map((label) => (
            <Link key={label} href="#" variant="caption" color="text.disabled" underline="hover">
              {label}
            </Link>
          ))}
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
