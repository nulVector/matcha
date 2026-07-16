import ActiveChatPage from "@/components/home/chat/activeChat";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
};

export default function ChatPage() {
  return <ActiveChatPage />;
}
