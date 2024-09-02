import { randomUUID } from 'crypto';
import { resolveRef } from './SchemaUtils'; // Import resolveRef from SchemaUtils

export class JsonGenerator {
  private schema: any;
  private rootSchema: any;
  private lastIDCreated?: string;

  constructor(schema: any, rootSchema: any) {
    this.rootSchema = rootSchema;
    this.schema = this.resolveSchema(schema);
    this.lastIDCreated = undefined;
  }

  private resolveSchema(schema: any): any {
    try {
      return resolveRef(schema, this.rootSchema);
    } catch (error) {
      console.error('Error resolving schema:', error);
      return null;
    }
  }

  public generate(name: string): { [key: string]: any } | undefined {
    if (!this.schema?.properties) return undefined;
    const jsonResult: { [key: string]: any } = {};

    try {
      for (const key in this.schema.properties) {
        const property = resolveRef(this.schema.properties[key], this.rootSchema);
        
        switch (key) {
          case '$label':
            jsonResult.$label = name;
            break;
          case '$id':
            jsonResult.$id = this.generateUUID();
            break;
          case '$model':
            jsonResult.$model = this.schema.$id;
            break;
          default:
            this.handleProperty(jsonResult, key, property);
            break;
        }
      }
    } catch (error) {
      console.error('Error generating JSON:', error);
      return undefined;
    }

    return jsonResult;
  }

  private handleProperty(jsonResult: { [key: string]: any }, key: string, property: any): void {
    const type = property.type;

    try {
      switch (type) {
        case 'string':
          jsonResult[key] = property.const ?? property.default ?? '';
          break;
        case 'number':
          jsonResult[key] = property.const ?? property.default ?? 0;
          break;
        case 'boolean':
          jsonResult[key] = property.const ?? property.default ?? false;
          break;
        case 'array':
          jsonResult[key] = property.const ?? property.default ?? [];
          break;
        case 'object':
          jsonResult[key] = this.initializeObject(property);
          break;
        default:
          // Handle other types or do nothing
          break;
      }
    } catch (error) {
      console.error(`Error handling property ${key}:`, error);
    }
  }

  private initializeObject(property: any): { [key: string]: any } {
    // Initialize with default values or a custom structure based on the schema
    const defaultObject: { [key: string]: any } = {};

    if (property.properties) {
      // Recursively initialize object properties
      for (const [propKey, propValue] of Object.entries(property.properties)) {
        defaultObject[propKey] = this.initializeProperty(propValue);
      }
    }

    return property.const ?? property.default ?? defaultObject;
  }

  private initializeProperty(property: any): any {
    switch (property.type) {
      case 'string':
        return property.const ?? property.default ?? '';
      case 'number':
        return property.const ?? property.default ?? 0;
      case 'boolean':
        return property.const ?? property.default ?? false;
      case 'array':
        return property.const ?? property.default ?? [];
      case 'object':
        return this.initializeObject(property);
      default:
        return null;
    }
  }

  private generateUUID(): string {
    return randomUUID();
  }
}