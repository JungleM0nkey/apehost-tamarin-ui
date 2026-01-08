"use client";

import { useChatStore } from "@/store/chat-store";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function SettingsPanel() {
  const { settings, setSettings } = useChatStore();

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-[#99774f] uppercase tracking-wider">
          Generation Settings
        </h3>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-sm text-[#cc9944]">Temperature</label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3 h-3 text-[#99774f]" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1a] border-[#664422] text-[#ffddaa]">
                  <p className="max-w-xs text-xs">
                    Controls randomness. Lower values make output more focused,
                    higher values make it more creative.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm text-[#ffaa00]">
              {settings.temperature.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.temperature]}
            onValueChange={([v]) => setSettings({ temperature: v })}
            min={0}
            max={2}
            step={0.01}
            className="w-full [&_[role=slider]]:bg-[#ffaa00] [&_[role=slider]]:border-[#cc7700] [&_.relative]:bg-[#332211] [&_[data-disabled]]:bg-[#664422]"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-sm text-[#cc9944]">Max Tokens</label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3 h-3 text-[#99774f]" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1a] border-[#664422] text-[#ffddaa]">
                  <p className="max-w-xs text-xs">
                    Maximum number of tokens to generate in the response.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Input
            type="number"
            value={settings.maxTokens}
            onChange={(e) =>
              setSettings({ maxTokens: parseInt(e.target.value) || 2048 })
            }
            min={1}
            max={32768}
            className="bg-[#1a1a1a] border-[#664422] text-[#ffddaa] focus:border-[#ffaa00]"
          />
        </div>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-sm text-[#cc9944]">Top P</label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3 h-3 text-[#99774f]" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1a] border-[#664422] text-[#ffddaa]">
                  <p className="max-w-xs text-xs">
                    Nucleus sampling. Consider tokens with top_p probability
                    mass.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm text-[#ffaa00]">
              {settings.topP.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.topP]}
            onValueChange={([v]) => setSettings({ topP: v })}
            min={0}
            max={1}
            step={0.01}
            className="w-full [&_[role=slider]]:bg-[#ffaa00] [&_[role=slider]]:border-[#cc7700] [&_.relative]:bg-[#332211]"
          />
        </div>

        <Separator className="bg-[#332211]" />

        {/* System Prompt */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <label className="text-sm text-[#cc9944]">System Prompt</label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3 h-3 text-[#99774f]" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#1a1a1a] border-[#664422] text-[#ffddaa]">
                <p className="max-w-xs text-xs">
                  Instructions that define the AI's behavior and personality.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ systemPrompt: e.target.value })}
            placeholder="You are a helpful AI assistant..."
            rows={4}
            className="bg-[#1a1a1a] border-[#664422] text-[#ffddaa] resize-none text-sm focus:border-[#ffaa00] placeholder:text-[#99774f]"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
