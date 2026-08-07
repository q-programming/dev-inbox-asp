import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Footer from '@app/common/footer/Footer.tsx';
import { AppRoute } from '@app/routes';
import GitHubIcon from '@mui/icons-material/GitHub';
import LoginIcon from '@mui/icons-material/Login';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLoginMutation } from '@shared/hooks/useAuthQuery';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { redirectTo, consumeReturnPath } from '@shared/utils/navigation';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const status = useUserStore((state) => state.status);
  const loginMutation = useLoginMutation();
  const [githubLoading, setGithubLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  if (status === AuthStatus.AUTHENTICATED) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  const isBusy = loginMutation.isPending || githubLoading;

  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => navigate(consumeReturnPath() ?? AppRoute.INBOX),
    });
  };

  return (
    <Box
      data-testid="login-page"
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
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your developer workflows efficiently.
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
            <TextField
              data-testid="login-email"
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
              data-testid="login-password"
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
            />

            {loginMutation.isError && (
              <Typography variant="caption" color="error" data-testid="login-error">
                Invalid email or password. Please try again.
              </Typography>
            )}

            <Button
              data-testid="login-submit"
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isBusy}
              endIcon={
                loginMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <LoginIcon />
                )
              }
              sx={{ mt: 1 }}
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled">
              or
            </Typography>
          </Divider>

          <Button
            data-testid="login-github"
            variant="outlined"
            fullWidth
            size="large"
            disabled={isBusy}
            startIcon={
              githubLoading ? <CircularProgress size={18} color="inherit" /> : <GitHubIcon />
            }
            color="inherit"
            onClick={() => {
              setGithubLoading(true);
              redirectTo(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/github`);
            }}
          >
            {githubLoading ? 'Redirecting…' : 'Continue with GitHub'}
          </Button>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          No account?{' '}
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(AppRoute.REGISTER)}
            sx={{ fontWeight: 700 }}
          >
            Register
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
