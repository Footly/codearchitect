import React, { useState, useEffect } from 'react';
import { Checkbox } from '../Checkbox';
import { TextArea } from '../TextArea';
import { TextField } from '../TextField';
import { Row, Column } from '../Flex';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { ReactTags, Tag, TagSuggestion } from 'react-tag-autocomplete'

type PropertySchema = {
  type: string;
  multiline?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  properties?: Record<string, PropertySchema>; // Nested properties
  items?: PropertySchema; // Single schema for items
  tag?: any;
  enum?: any[];
};

const TextFieldWidget: React.FC<{
  label: string;
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}> = ({ label, initialValue, readOnly, onChange }) => {
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

const DropdownWidget: React.FC<{
  label: string;
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  options: string[]; // Array of enum options for the dropdown
}> = ({ label, initialValue, readOnly, onChange, options }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <Column alignStart={true}>
      {label}
      <select
        disabled={readOnly}
        value={localValue}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Column>
  );
};

const TextAreaWidget: React.FC<{
  label: string;
  initialValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}> = ({ label, initialValue, readOnly, onChange }) => {
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

const TagsFieldWidget: React.FC<{
  label: string;
  initialValue: string[];
  readOnly: boolean;
  suggestions: TagSuggestion[];
  add: boolean;
  onDelete: (index: number) => void;
  OnAdd : (tag: Tag) => void;
}> = ({ label, initialValue, add, readOnly, suggestions, onDelete, OnAdd}) => {
  const [tags, setTags] = React.useState<Array<Tag>>(initialValue.map((value: string) => ({ label: value, value: value})));

  const handleDelete = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
    onDelete(index);
  };

  const handleAddition = (tag: Tag) => {
    setTags((prevTags) => {
      return [...prevTags, tag];
    });
    OnAdd(tag);
  };

  const handleEnter= (value: string) => {
    console.log("haha", value);
  }

  return (
    <Column alignStart={true}>
      {label}
      <ReactTags
        allowNew={add}
        onInput={handleEnter}
        selected={tags}
        allowBackspace={true}
        suggestions={suggestions}
        onDelete={handleDelete}
        onAdd={handleAddition}
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

  const renderStringProperty = (
    label: string,
    initialValue: string,
    readOnly: boolean,
    multiline: boolean,
    onChange: (value: string) => void,
    enumValues?: string[] // Optional parameter to hold enum values
  ) => {
    if (multiline) {
      return (
        <TextAreaWidget
          label={label}
          initialValue={initialValue}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    } else if (enumValues && enumValues.length > 0) { // Check if enumValues are provided
      return (
        <DropdownWidget
          label={label}
          initialValue={initialValue}
          options={enumValues} // Pass enum options to dropdown
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    } else {
      return (
        <TextFieldWidget
          label={label}
          initialValue={initialValue}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    }
  };


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

  const renderArrayStringProperty = (
    label: string,
    path: string[],
    initialData: string[],
    options?: string[]
  ) => {
    console.error(options);
    if (options && options.length > 0) {
      const enums = options.map((option) => {
        return {
          label: option,
          value: option
        };
      });
      return (
        <Column alignStart={true} key={label}>
          <Row>
            <TagsFieldWidget
              label={label}
              initialValue={initialData}
              suggestions={enums}
              add={false}
              readOnly={false} // Set to true if the field should be read-only
              onDelete={(index: number) => {
                updateFormData(path, initialData.filter((_, i) => i !== index));
              }}
              OnAdd={(tag: Tag) => {
                updateFormData(path, [...initialData, tag.value]);
              }}
            />
          </Row>
        </Column>
      );
    } else {
      return (
        <Column alignStart={true} key={label}>
          <Row>
            <TagsFieldWidget
              label={label}
              add={true}
              suggestions={[]}
              initialValue={initialData}
              readOnly={false} // Set to true if the field should be read-only
              onDelete={(index: number) => {
                updateFormData(path, initialData.filter((_, i) => i !== index));
              }}
              OnAdd={(tag: Tag) => {
                updateFormData(path, [...initialData, tag.value]);
              }}
            />
          </Row>
        </Column>
      );
    }
  };

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
        const enums = property.enum;
        return renderStringProperty(
          label,
          initialValue as string,
          readOnly,
          property.multiline || false,
          (value) => {
            console.log("Setting value", value);
            console.log("Path", childPath);
            updateFormData(childPath, value);
          },
          enums
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
          if (property.items.type === 'string') {
            const enums = property.items.enum;
            return renderArrayStringProperty(
              label,
              childPath,
              initialValue as string[],
              enums
            );
          }
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