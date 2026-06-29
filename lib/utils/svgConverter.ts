/**
 * Converts Angular-based SVG markup to Next.js/React-compatible SVG
 * 
 * This function handles:
 * - Removal of Angular-specific attributes (_ngcontent-*)
 * - Conversion of class to className
 * - Conversion of Angular directives (svg-click, svgClickedVal) to React data attributes
 * - Conversion of custom attributes (variable, type, side) to data-* attributes
 * - Conversion of XML namespaces and attributes to React-compatible format
 */

export interface SvgConversionOptions {
  /**
   * Whether to convert the SVG string to JSX-compatible format
   * If true, returns a string that can be used with dangerouslySetInnerHTML
   * If false, returns a cleaned string
   */
  asString?: boolean;
  
  /**
   * Whether to convert class to className (for React JSX)
   * If false (default), preserves 'class' for HTML strings (dangerouslySetInnerHTML)
   * If true, converts 'class' to 'className' for React JSX usage
   */
  convertClassToClassName?: boolean;
  
  /**
   * Custom attribute mappings
   * Maps Angular attribute names to React attribute names
   */
  customMappings?: Record<string, string>;
}

/**
 * Converts Angular SVG string to React/Next.js compatible format
 * 
 * @param angularSvg - The Angular SVG string to convert
 * @param options - Conversion options
 * @returns Converted SVG string ready for React/Next.js
 * 
 * @example
 * ```tsx
 * const angularSvg = '<svg _ngcontent-ng-c123="" class="test" svg-click="">...</svg>';
 * const reactSvg = convertAngularSvgToReact(angularSvg);
 * // Returns: '<svg class="test">...</svg>' (preserves class for HTML strings)
 * 
 * // For React JSX, use convertClassToClassName option:
 * const reactSvg = convertAngularSvgToReact(angularSvg, { convertClassToClassName: true });
 * // Returns: '<svg className="test">...</svg>'
 * ```
 */
export function convertAngularSvgToReact(
  angularSvg: string,
  options: SvgConversionOptions = {}
): string {
  const {
    asString = true,
    convertClassToClassName = false,
    customMappings = {}
  } = options;

  let converted = angularSvg;

  // Remove Angular-specific _ngcontent attributes
  converted = converted.replace(/\s*_ngcontent-[^=]*="[^"]*"/g, '');

  // Remove svg-click directive (Angular-specific, not needed in React)
  converted = converted.replace(/\s*svg-click="[^"]*"/g, '');

  // Convert svgClickedVal to data-svg-clicked-val (React data attribute)
  converted = converted.replace(
    /\ssvgClickedVal="([^"]*)"/g,
    ' data-svg-clicked-val="$1"'
  );

  // Convert variable to data-variable
  converted = converted.replace(
    /\svariable="([^"]*)"/g,
    ' data-variable="$1"'
  );

  // Convert type to data-type (if it's a custom attribute, not standard SVG)
  // Note: We'll convert all 'type' attributes to data-type for consistency
  // You may want to adjust this based on your specific use case
  converted = converted.replace(
    /\stype="([^"]*)"/g,
    ' data-type="$1"'
  );

  // Convert side to data-side
  converted = converted.replace(
    /\sside="([^"]*)"/g,
    ' data-side="$1"'
  );

  // Convert class to className only if explicitly requested (for React JSX)
  // By default, preserve 'class' for HTML strings used with dangerouslySetInnerHTML
  if (convertClassToClassName) {
    converted = converted.replace(/\sclass="([^"]*)"/g, ' className="$1"');
  }

  // Convert XML namespaces to React format
  converted = converted.replace(
    /\sxmlns:xlink="([^"]*)"/g,
    ' xmlnsXlink="$1"'
  );

  // Convert xml:space to xmlSpace
  converted = converted.replace(
    /\sxml:space="([^"]*)"/g,
    ' xmlSpace="$1"'
  );

  // Convert enable-background style to enableBackground attribute
  // Handle style="enable-background: new 0 0 240 240" -> enableBackground="new 0 0 240 240"
  converted = converted.replace(
    /style="enable-background:\s*new\s+([^"]*)"/g,
    ' enableBackground="new $1"'
  );
  
  // Handle cases where enable-background is part of a larger style attribute
  converted = converted.replace(
    /style="([^"]*?)enable-background:\s*new\s+([^;"]*);?([^"]*)"/g,
    (match, before, coords, after) => {
      const remainingStyle = (before + after).trim().replace(/^;+|;+$/g, '').replace(/;+/g, ';');
      if (remainingStyle) {
        return ` style="${remainingStyle}" enableBackground="new ${coords}"`;
      }
      return ` enableBackground="new ${coords}"`;
    }
  );

  // Apply custom mappings
  Object.entries(customMappings).forEach(([angularAttr, reactAttr]) => {
    const regex = new RegExp(`\\s${angularAttr}="([^"]*)"`, 'g');
    converted = converted.replace(regex, ` ${reactAttr}="$1"`);
  });

  // Clean up any double spaces that might have been created
  converted = converted.replace(/\s{2,}/g, ' ');

  // Clean up spaces before closing tags
  converted = converted.replace(/\s+>/g, '>');

  return converted.trim();
}

/**
 * Converts Angular SVG string to a React component-friendly format
 * Returns an object with the cleaned SVG string and metadata
 * 
 * @param angularSvg - The Angular SVG string to convert
 * @param options - Conversion options
 * @returns Object containing converted SVG and metadata
 */
export function convertAngularSvgToReactComponent(
  angularSvg: string,
  options: SvgConversionOptions = {}
): {
  svg: string;
  viewBox?: string;
  id?: string;
  className?: string;
} {
  const converted = convertAngularSvgToReact(angularSvg, options);

  // Extract common attributes for component props
  const viewBoxMatch = converted.match(/viewBox="([^"]*)"/);
  const idMatch = converted.match(/id="([^"]*)"/);
  // Check for both class and className (depending on conversion options)
  const classNameMatch = converted.match(/(?:className|class)="([^"]*)"/);

  return {
    svg: converted,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : undefined,
    id: idMatch ? idMatch[1] : undefined,
    className: classNameMatch ? classNameMatch[1] : undefined,
  };
}

/**
 * Helper function to safely use converted SVG with dangerouslySetInnerHTML
 * 
 * @param angularSvg - The Angular SVG string to convert
 * @param options - Conversion options
 * @returns Object with __html property for dangerouslySetInnerHTML
 * 
 * @example
 * ```tsx
 * const svgHtml = getSvgHtml(angularSvg);
 * return <div dangerouslySetInnerHTML={svgHtml} />;
 * ```
 */
export function getSvgHtml(
  angularSvg: string,
  options: SvgConversionOptions = {}
): { __html: string } {
  return {
    __html: convertAngularSvgToReact(angularSvg, options),
  };
}
