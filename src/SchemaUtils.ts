// SchemaUtils.ts

/**
 * Resolves JSON schema references ($ref) within a given schema.
 *
 * @param {any} schema - The schema containing potential $ref references.
 * @param {any} root_schema - The root schema to resolve references against.
 * @returns {any} - The schema with all references resolved.
 */
export function resolveRef(schema: any, root_schema: any): any {
    for (const key in schema) {
      if (key === "$ref") {
        const ref = schema["$ref"].split("/");
        // Discard the first element (usually '#')
        ref.shift();
        // Convert all %24 to $ using map
        const ref_keys = ref.map((item: string) => item.replace(/%24/g, "$"));
        // Get the root schema
        let current_schema = root_schema;
        // Loop through the ref_keys to resolve the reference
        for (const ref_key of ref_keys) {
          current_schema = current_schema[ref_key];
        }
        // Merge the resolved schema into the current schema
        schema = { ...schema, ...current_schema };
      }
    }
    return schema;
  }  