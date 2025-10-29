import React from 'react';
import Box from '@mui/material/Box';
import Sidebars from './Sidebars';
import ChatArea from './ChatArea';
import { useSearchParams } from 'react-router-dom';

const ChatPage = () => {
  const [params] = useSearchParams();
  const withParam = params.get('with');
  const receiverId = withParam ? parseInt(withParam, 10) : undefined;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebars />
      <Box sx={{ flex: 1 }}>
        <ChatArea receiverId={receiverId} />
      </Box>
    </Box>
  );
};

export default ChatPage;
