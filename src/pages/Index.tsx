import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ChatInput from '@/components/ChatInput';
import { createWorkflow } from '@/lib/api';

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const { workflow_id } = await createWorkflow(text);
      navigate(`/workflow/${workflow_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <ChatInput onSubmit={handleSubmit} loading={loading} error={error} />
    </Layout>
  );
};

export default Index;
