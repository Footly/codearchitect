import React, { useState, useEffect } from 'react';
import { Checkbox } from '../Checkbox';
import { TextArea } from '../TextArea';
import { TextField } from '../TextField';
import { Row, Column } from '../Flex';
import { Button } from '../Button';
import { Icon } from '../Icon';

type PropertySchema = {
  type: string;
  multiline?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  properties?: Record<string, PropertySchema>; // Nested properties
  items?: PropertySchema; // Single schema for items
};

type RenderSchemaProps = {
  schema: {
    properties?: Record<string, PropertySchema>;
  };
  path: string[];
  initialData: Record<string, any>;
};

const TextFieldWidget: React.FC<{
  label: string;
  value: string;
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, initialValue, readOnly, onChange }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <Column alignStart={true}>
      {label}
      <TextField
        readOnly={readOnly}
        value={localValue}
        onChange={handleChange}
      />
    </Column>
  );
};

const TextAreaWidget: React.FC<{
  label: string;
  value: string;
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, initialValue, readOnly, onChange }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <Column alignStart={true}>
      {label}
      <TextArea
        disabled={readOnly}
        value={localValue}
        onChange={handleChange}
      />
    </Column>
  );
};

const CheckboxWidget: React.FC<{
  label: string;
  checked: boolean;
  initialChecked: boolean;
  readOnly: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, initialChecked, readOnly, onChange }) => {
  const [localChecked, setLocalChecked] = useState(initialChecked);

  const handleChange = (checked: boolean) => {
    setLocalChecked(checked);
    onChange(checked);
  };

  return (
    <Column alignStart={true}>
      {label}
      <Checkbox
        disabled={readOnly}
        checked={localChecked}
        onChange={handleChange}
      />
    </Column>
  );
};

// Helper function to get nested value from an object based on path
const getNestedValue = (obj: Record<string, any>, path: string[]): any => {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

// Helper function to set nested value in an object based on path
const setNestedValue = (obj: Record<string, any>, path: string[], value: any): void => {
  path.reduce((acc, key, index) => {
    if (index === path.length - 1) {
      acc[key] = value;
    } else {
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }
    return acc;
  }, obj);
};

const RenderSchema: React.FC<{
  schema: { properties?: Record<string, PropertySchema> };
  path: string[];
  formData: Record<string, any>;
  updateFormData: (path: string[], value: any) => void;
}> = ({ schema, path, formData, updateFormData }) => {
  if (!schema) return null;

  const { properties = {} } = schema;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleToggleExpand = (label: string) => () => {
    setExpandedSections(prevState => {
      const newExpandedSections = new Set(prevState);
      if (newExpandedSections.has(label)) {
        newExpandedSections.delete(label);
      } else {
        newExpandedSections.add(label);
      }
      return newExpandedSections;
    });
  };

  const renderBooleanProperty = (label: string, initialValue: boolean, readOnly: boolean, onChange: (checked: boolean) => void) => (
    <CheckboxWidget
      label={label}
      checked={initialValue}
      initialChecked={initialValue}
      readOnly={readOnly}
      onChange={onChange}
    />
  );

  const renderStringProperty = (label: string, initialValue: string, readOnly: boolean, multiline: boolean, onChange: (value: string) => void) => (
    multiline ? (
      <TextAreaWidget
        label={label}
        value={initialValue}
        initialValue={initialValue}
        readOnly={readOnly}
        onChange={onChange}
      />
    ) : (
      <TextFieldWidget
        label={label}
        value={initialValue}
        initialValue={initialValue}
        readOnly={readOnly}
        onChange={onChange}
      />
    )
  );

  const renderObjectProperty = (label: string, property: PropertySchema, isExpanded: boolean, handleToggleExpand: () => void, path: string[]) => (
    <Column alignStart={true} key={label}>
      <Row>
        {label}
        <Button icon onClick={() => handleToggleExpand()}>
          <Icon icon={isExpanded ? 'chevron-down' : 'chevron-right'} />
        </Button>
      </Row>
      {isExpanded && (
        <RenderSchema
          schema={{ properties: property.properties }}
          path={path}
          formData={formData}
          updateFormData={updateFormData}
        />
      )}
    </Column>
  );

  const renderArrayProperty = (label: string, itemSchema: PropertySchema, path: string[], initialData: any[], isExpanded: boolean, handleArrayExpand: () => void) => (
    <Column alignStart={true} key={label}>
      <Row>
        {label}
        <Button icon onClick={() => handleArrayExpand()}>
          <Icon icon={isExpanded ? 'chevron-down' : 'chevron-right'} />
        </Button>
      </Row>
      {isExpanded && (
        <Column alignStart={true} key={label}>
          {initialData.map((item: any, index: number) => {
            const itemPath = [...path, index.toString()];
            switch (itemSchema.type) {
              case 'boolean':
                return (
                  <CheckboxWidget
                    key={index}
                    label={`Item ${index}`}
                    checked={initialData[index]}
                    initialChecked={initialData[index]}
                    readOnly={false}
                    onChange={(checked) => {
                      updateFormData(itemPath, checked);
                    }}
                  />
                );
              case 'string':
                return renderStringProperty(
                  `Item ${index}`,
                  initialData[index] || '',
                  false,
                  itemSchema.multiline || false,
                  (value) => {
                    updateFormData(itemPath, value);
                  }
                );
              case 'object':
                const isExpanded = expandedSections.has(`Item ${index}`);
                return renderObjectProperty(
                  `Item ${index}`,
                  itemSchema,
                  isExpanded,
                  handleToggleExpand(`Item ${index}`),
                  itemPath
                );
              default:
                return null;
            }
          })}
        </Column>
      )}
    </Column>
  );

  const renderProperty = (label: string, property: PropertySchema, path: string[]) => {
    const readOnly = property.readOnly === true;
    const childPath = [...path, label];
    const initialValue = getNestedValue(formData, childPath) || '';
    const isExpanded = expandedSections.has(label);

    switch (property.type) {
      case 'boolean':
        return renderBooleanProperty(
          label,
          initialValue as boolean,
          readOnly,
          (checked) => {
            updateFormData(childPath, checked);
          }
        );
      case 'string':
        return renderStringProperty(
          label,
          initialValue as string,
          readOnly,
          property.multiline || false,
          (value) => {
            updateFormData(childPath, value);
          }
        );
      case 'object':
        if (property.properties) {
          return renderObjectProperty(
            label,
            property,
            isExpanded,
            handleToggleExpand(label),
            childPath
          );
        }
        return null;
      case 'array':
        if (property.items) {
          return renderArrayProperty(
            label,
            property.items,
            childPath,
            initialValue as any[],
            isExpanded,
            handleToggleExpand(label)
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div>
      {Object.entries(properties).map(([label, property]) =>
        !property.hidden ? renderProperty(label, property, path) : null
      )}
    </div>
  );
};


type FormContainerProps = {
  schema: {
    properties?: Record<string, PropertySchema>;
  };
  initialData?: Record<string, any>;
};

export const FormContainer: React.FC<FormContainerProps> = ({ schema, initialData = {} }) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);

  // Effect to log formData whenever it changes
  useEffect(() => {
    console.log("Current Form Data:", JSON.stringify(formData, null, 2));
  }, [formData]);

  const updateFormData = (path: string[], value: any) => {
    setFormData(prevData => {
      const updatedData = { ...prevData };
      setNestedValue(updatedData, path, value);
      return updatedData;
    });
  };

  return (
    <RenderSchema
      schema={schema}
      path={[]}
      formData={formData}
      updateFormData={updateFormData}
    />
  );
};