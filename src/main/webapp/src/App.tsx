import { useHealthQuery } from '@/shared/hooks/useHealthQuery.ts';
import Alert from '@/shared/components/alert/alert.tsx';

export default function App() {
  const { isLoading, isSuccess } = useHealthQuery();

  return (
    <div>
      <Alert />
      <h1>Dev Inbox</h1>
      {isLoading ? <div>Loading...</div> : null}
      {isSuccess ? <div>API is healthy!</div> : <div>API not healthy!</div>}
    </div>
  );
}
