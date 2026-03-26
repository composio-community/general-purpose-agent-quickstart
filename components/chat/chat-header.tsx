"use client";

import { PanelLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { VercelIcon } from "./icons";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

const composioLogoSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/composio-logo.svg`;
const composioHref = "https://composio.dev";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <div className="flex items-center gap-1 md:hidden">
        <Link
          className="flex size-8 items-center justify-center rounded-lg"
          href={composioHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Image
            alt="Composio"
            className="size-5 dark:invert"
            height={20}
            src={composioLogoSrc}
            width={17}
          />
        </Link>
        <Link
          className="flex size-8 items-center justify-center rounded-lg"
          href="https://vercel.com/templates/next.js/chatbot"
          rel="noopener noreferrer"
          target="_blank"
        >
          <VercelIcon size={14} />
        </Link>
      </div>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <div className="hidden items-center gap-2 md:ml-auto md:flex">
        <Link
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
          href={composioHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Image
            alt="Composio"
            className="size-5 dark:invert"
            height={22}
            src={composioLogoSrc}
            width={19}
          />
        </Link>
        <Button
          asChild
          className="rounded-lg bg-foreground px-4 text-background hover:bg-foreground/90"
        >
          <Link
            href="https://vercel.com/templates/next.js/chatbot"
            rel="noopener noreferrer"
            target="_blank"
          >
            <VercelIcon size={16} />
            Deploy with Vercel
          </Link>
        </Button>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
