/**
 * DateTime Tool
 * Date and time utility functions
 */

import { defineTool } from "@/lib/services/tool-registry";

/**
 * Format a date according to options
 */
function formatDate(date: Date, format?: string, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone || "UTC",
  };

  switch (format) {
    case "date":
      options.dateStyle = "full";
      break;
    case "time":
      options.timeStyle = "long";
      break;
    case "datetime":
      options.dateStyle = "full";
      options.timeStyle = "long";
      break;
    case "iso":
      return date.toISOString();
    case "unix":
      return Math.floor(date.getTime() / 1000).toString();
    case "relative":
      return getRelativeTime(date);
    default:
      options.dateStyle = "full";
      options.timeStyle = "long";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, "second");
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, "minute");
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, "hour");
  } else if (Math.abs(diffDay) < 30) {
    return rtf.format(diffDay, "day");
  } else if (Math.abs(diffDay) < 365) {
    return rtf.format(Math.round(diffDay / 30), "month");
  } else {
    return rtf.format(Math.round(diffDay / 365), "year");
  }
}

/**
 * Parse a date string
 */
function parseDate(input: string): Date {
  // Handle special keywords
  const lower = input.toLowerCase().trim();
  
  if (lower === "now" || lower === "today") {
    return new Date();
  }
  
  if (lower === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  
  if (lower === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  // Try to parse as number (Unix timestamp)
  const timestamp = Number(input);
  if (!isNaN(timestamp)) {
    // If less than a reasonable date in ms, treat as seconds
    if (timestamp < 10000000000) {
      return new Date(timestamp * 1000);
    }
    return new Date(timestamp);
  }

  // Parse as date string
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Could not parse date: ${input}`);
  }
  
  return parsed;
}

/**
 * Register the datetime tool
 */
export function registerDateTimeTool(): void {
  defineTool(
    "datetime",
    "Get current date/time, parse dates, format dates, or calculate time differences. Supports various formats and timezones.",
    {
      action: {
        type: "string",
        description: "The action to perform: 'now' (get current time), 'parse' (parse a date string), 'format' (format a date), 'diff' (calculate difference between dates)",
        enum: ["now", "parse", "format", "diff"],
        required: true,
      },
      input: {
        type: "string",
        description: "For 'parse'/'format': the date string to process. For 'diff': the first date. Accepts: ISO strings, Unix timestamps, 'now', 'today', 'tomorrow', 'yesterday'",
        required: false,
      },
      input2: {
        type: "string",
        description: "For 'diff': the second date to compare against",
        required: false,
      },
      format: {
        type: "string",
        description: "Output format: 'date', 'time', 'datetime', 'iso', 'unix', 'relative'",
        enum: ["date", "time", "datetime", "iso", "unix", "relative"],
        required: false,
      },
      timezone: {
        type: "string",
        description: "Timezone for formatting (e.g., 'America/New_York', 'Europe/London', 'UTC')",
        required: false,
      },
    },
    (args) => {
      const action = args.action as string;
      const input = args.input as string | undefined;
      const input2 = args.input2 as string | undefined;
      const format = args.format as string | undefined;
      const timezone = args.timezone as string | undefined;

      switch (action) {
        case "now": {
          const now = new Date();
          return {
            iso: now.toISOString(),
            unix: Math.floor(now.getTime() / 1000),
            formatted: formatDate(now, format, timezone),
            timezone: timezone || "UTC",
          };
        }

        case "parse": {
          if (!input) {
            throw new Error("Input is required for 'parse' action");
          }
          const parsed = parseDate(input);
          return {
            input,
            iso: parsed.toISOString(),
            unix: Math.floor(parsed.getTime() / 1000),
            formatted: formatDate(parsed, format, timezone),
          };
        }

        case "format": {
          if (!input) {
            throw new Error("Input is required for 'format' action");
          }
          const date = parseDate(input);
          return {
            input,
            formatted: formatDate(date, format, timezone),
            format: format || "datetime",
            timezone: timezone || "UTC",
          };
        }

        case "diff": {
          if (!input || !input2) {
            throw new Error("Both input and input2 are required for 'diff' action");
          }
          const date1 = parseDate(input);
          const date2 = parseDate(input2);
          const diffMs = date2.getTime() - date1.getTime();
          const diffSec = Math.abs(diffMs / 1000);
          const diffMin = diffSec / 60;
          const diffHour = diffMin / 60;
          const diffDay = diffHour / 24;

          return {
            date1: date1.toISOString(),
            date2: date2.toISOString(),
            difference: {
              milliseconds: diffMs,
              seconds: Math.round(diffSec),
              minutes: Math.round(diffMin),
              hours: Math.round(diffHour * 100) / 100,
              days: Math.round(diffDay * 100) / 100,
            },
            relative: getRelativeTime(date2),
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    {
      category: "utility",
      enabled: true,
    }
  );
}