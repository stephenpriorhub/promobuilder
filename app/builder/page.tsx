import { Suspense } from "react";
import ChatInterface from "@/components/ChatInterface";

export default function BuilderPage() {
  return (
    <Suspense fallback={null}>
      <ChatInterface />
    </Suspense>
  );
}
