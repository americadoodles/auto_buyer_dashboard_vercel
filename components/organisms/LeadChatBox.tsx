'use client';

import React from 'react';
import { ChatBox, ChatBoxProps } from './ChatBox';

/** @deprecated Use ChatBox from './ChatBox' instead. */
export type LeadChatBoxProps = ChatBoxProps;

/** @deprecated Use ChatBox from './ChatBox' instead. */
export const LeadChatBox: React.FC<ChatBoxProps> = (props) => <ChatBox {...props} />;
