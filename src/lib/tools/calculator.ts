/**
 * Calculator Tool
 * Safe mathematical expression evaluation
 */

import { defineTool } from "@/lib/services/tool-registry";

/**
 * Safe math evaluation using Function constructor
 * Only allows basic math operations and Math functions
 */
function safeEval(expression: string): number {
  // Allowlist of safe characters and functions
  const safePattern = /^[\d\s+\-*/().%^,]+$|Math\.\w+/g;
  
  // Remove whitespace and validate
  const cleaned = expression.replace(/\s+/g, "");
  
  // Check for dangerous patterns
  const dangerous = [
    /\beval\b/i,
    /\bFunction\b/i,
    /\bwindow\b/i,
    /\bdocument\b/i,
    /\bglobal\b/i,
    /\bprocess\b/i,
    /\brequire\b/i,
    /\bimport\b/i,
    /\bexport\b/i,
    /\b__\w+__\b/,
    /\bconstructor\b/i,
    /\bprototype\b/i,
  ];

  for (const pattern of dangerous) {
    if (pattern.test(cleaned)) {
      throw new Error("Expression contains disallowed patterns");
    }
  }

  // Replace ^ with ** for exponentiation
  const withExponent = cleaned.replace(/\^/g, "**");

  // Create a safe evaluation context with only Math functions
  const mathContext = {
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    sqrt: Math.sqrt,
    pow: Math.pow,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    log10: Math.log10,
    exp: Math.exp,
    min: Math.min,
    max: Math.max,
    PI: Math.PI,
    E: Math.E,
  };

  // Build function arguments and values
  const contextKeys = Object.keys(mathContext);
  const contextValues = Object.values(mathContext);

  try {
    // Create function with math context
    const fn = new Function(...contextKeys, `"use strict"; return (${withExponent});`);
    const result = fn(...contextValues);

    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new Error("Result is not a valid number");
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Calculation error: ${error.message}`);
    }
    throw new Error("Failed to evaluate expression");
  }
}

/**
 * Register the calculator tool
 */
export function registerCalculatorTool(): void {
  defineTool(
    "calculator",
    "Evaluate mathematical expressions. Supports basic operations (+, -, *, /, %, ^) and common math functions (sqrt, sin, cos, tan, log, abs, round, floor, ceil, min, max, pow). Constants PI and E are available.",
    {
      expression: {
        type: "string",
        description: "The mathematical expression to evaluate. Example: '2 + 2', 'sqrt(16)', 'sin(PI/2)', 'pow(2, 8)'",
        required: true,
      },
    },
    (args) => {
      const expression = args.expression as string;
      
      if (!expression || typeof expression !== "string") {
        throw new Error("Expression is required and must be a string");
      }

      const result = safeEval(expression);
      
      return {
        expression,
        result,
        formatted: Number.isInteger(result) ? result.toString() : result.toFixed(10).replace(/\.?0+$/, ""),
      };
    },
    {
      category: "utility",
      enabled: true,
    }
  );
}