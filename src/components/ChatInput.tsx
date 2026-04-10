import { useState } from 'react';
import { Box, TextField, IconButton, Typography, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  error: string | null;
}

const ChatInput = ({ onSubmit, loading, error }: ChatInputProps) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
  };

  return (
    <Box className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Box className="flex flex-col items-center gap-3 mb-10">
        <Box className="p-3 rounded-2xl bg-secondary">
          <AutoAwesomeIcon sx={{ fontSize: 40, color: 'hsl(217, 91%, 60%)' }} />
        </Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: 'hsl(213, 31%, 91%)', letterSpacing: '-0.03em', textAlign: 'center' }}
        >
          Describe your workflow
        </Typography>
        <Typography sx={{ color: 'hsl(215, 20%, 55%)', textAlign: 'center', maxWidth: 480 }}>
          Enter a natural language description and we'll generate an AI-powered execution plan.
        </Typography>
      </Box>

      <Box className="w-full max-w-2xl">
        <Box
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2"
          sx={{ boxShadow: '0 4px 24px hsl(217 91% 60% / 0.08)' }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="e.g. Scrape website, summarize with GPT, email results..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={loading}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                color: 'hsl(213, 31%, 91%)',
                px: 2,
                py: 1,
                '& ::placeholder': { color: 'hsl(215, 20%, 45%)' },
              },
            }}
          />
          <IconButton
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            sx={{
              bgcolor: 'hsl(217, 91%, 60%)',
              color: 'hsl(222, 47%, 6%)',
              borderRadius: '12px',
              width: 44,
              height: 44,
              '&:hover': { bgcolor: 'hsl(217, 91%, 50%)' },
              '&.Mui-disabled': { bgcolor: 'hsl(217, 33%, 20%)', color: 'hsl(215, 20%, 40%)' },
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : <SendIcon />}
          </IconButton>
        </Box>
        {error && (
          <Typography sx={{ color: 'hsl(0, 84%, 60%)', mt: 2, textAlign: 'center', fontSize: 14 }}>
            {error}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ChatInput;
