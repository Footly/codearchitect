import React, { useState, useEffect } from 'react';
import { Checkbox } from '../Checkbox';
import { TextArea } from '../TextArea';
import { TextField } from '../TextField';
import { Row, Column } from '../Flex';
import { Button } from '../Button';
import { Icon } from '../Icon';
import Select, { ActionMeta, OnChangeValue, SingleValue, MultiValue } from 'react-select';
import { Tag } from "react-tag-input/types/components/SingleTag";
import { WithContext as ReactTags, SEPARATORS } from "react-tag-input";
import MarkdownEditor from '@uiw/react-markdown-editor';

type PropertySchema = {
  type: string;
  multiline?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  properties?: Record<string, PropertySchema>; // Nested properties
  items?: PropertySchema; // Single schema for items
  tag?: any;
  enum?: any[];
  uniqueItems: boolean;
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

interface Suggestion {
  readonly value: string;
  readonly label: string;
}

const SelectFieldWidget: React.FC<{
  label: string;
  initialValue: string | string[]; // can be a single string or an array of strings
  readOnly: boolean;
  suggestions?: readonly Suggestion[];
  editable: boolean;
  isMulti: boolean;
  onChange: (value: string | string[]) => void; // single string for non-multi, array of strings for multi
}> = ({ label, initialValue, editable, isMulti, readOnly, suggestions, onChange }) => {
  // Initialize state based on whether `isMulti` is true or false
  const initialMulti = Array.isArray(initialValue)
    ? initialValue.map((val) => ({ value: val, label: val }))
    : [{ value: initialValue as string, label: initialValue as string }];

  const [multiValues, setMultiValues] = React.useState<readonly Suggestion[]>(initialMulti);
  const [singleValue, setSingleValue] = React.useState<Suggestion | null>(
    Array.isArray(initialValue) ? initialMulti[0] : initialMulti[0]
  );

  const handleMultiChange = (selectedOptions: OnChangeValue<Suggestion, true>) => {
    setMultiValues(selectedOptions as Suggestion[]);
    const selectedStrings = (selectedOptions as Suggestion[]).map((option) => option.value);
    onChange(selectedStrings); // Send back as an array of strings
  };

  const handleSingleChange = (selectedOption: OnChangeValue<Suggestion, false>) => {
    setSingleValue(selectedOption as Suggestion);
    onChange((selectedOption as Suggestion).value); // Send back as a single string
  };

  // Choose the appropriate handleChange function
  const handleChange = (newValue: MultiValue<Suggestion> | SingleValue<Suggestion>, actionMeta: ActionMeta<Suggestion>) => {
    if (isMulti) {
      handleMultiChange(newValue as MultiValue<Suggestion>);
    } else {
      handleSingleChange(newValue as SingleValue<Suggestion>);
    }
  };

  return (
    <Column alignStart={true}>
      {label}
      <Select
        name={label}
        options={suggestions}
        defaultValue={isMulti ? multiValues : singleValue}
        onChange={handleChange}
        isDisabled={readOnly}
        isSearchable={editable}
        isMulti={isMulti}
      />
    </Column>
  );
};

const TagsFieldWidget: React.FC<{
  label: string;
  initialValue: string[];
  readOnly: boolean;
  suggestions?: Tag[];
  editable: boolean;
  maxitems?: number;
  onDelete: (index: number) => void;
  onAddition: (tag: Tag) => void;
  onDrag: (tag: Tag, currPos: number, newPos: number) => void;
  onUpdate: (index: number, newTag: Tag) => void;
}> = ({ label, initialValue, maxitems, editable, readOnly, suggestions, onDelete, onAddition, onDrag, onUpdate }) => {
  const [tags, setTags] = React.useState<Array<Tag>>(initialValue.map((value: string) => ({ id: value, text: value, className: "" })));

  const handleDelete = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
    onDelete(index);
  };

  const handleUpdate = (index: number, newTag: Tag) => {
    const newTags = tags.slice();
    newTags[index] = newTag;
    setTags(newTags);
    onUpdate(index, newTag);
  };

  const handleAddition = (tag: Tag) => {
    if (maxitems && tags.length >= maxitems) {
      return;
    }
    // Check if suggestions are provided and if the tag text matches any suggestion
    setTags((prevTags) => [...prevTags, tag]);
    onAddition(tag);
  };

  const handleDrag = (tag: Tag, currPos: number, newPos: number) => {
    const newTags = tags.slice();

    newTags.splice(currPos, 1);
    newTags.splice(newPos, 0, tag);

    // re-render
    setTags(newTags);
    onDrag(tag, currPos, newPos);
  };

  const handleTagClick = (index: number) => {
    console.log("The tag at index " + index + " was clicked");
  };

  return (
    <Column alignStart={true}>
      {label}
      <ReactTags
        tags={tags}
        placeholder={""}
        allowDragDrop={true}
        readOnly={readOnly}
        minQueryLength={1}
        inputFieldPosition="inline"
        editable={editable}
        suggestions={suggestions}
        handleDelete={handleDelete}
        handleAddition={handleAddition}
        handleDrag={handleDrag}
        handleTagClick={handleTagClick}
        onTagUpdate={handleUpdate}
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
      const suggestions: Suggestion[] = enumValues.map((val) => {
        return {
          value: val,
          label: val
        };
      });
      return (
        <SelectFieldWidget
          label={label}
          initialValue={[initialValue]}
          suggestions={suggestions}
          editable={false}
          isMulti={false}
          readOnly={false} // Set to true if the field should be read-only
          onChange={(value: string[] | string) => {
            if (!Array.isArray(value))
              onChange(value)
          }}
        />);
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
    uniqueItems: boolean,
    options: string[]

  ) => {
    if (options && options.length > 0) {
      if (uniqueItems) {
        const enums: Suggestion[] = options.map((option) => {
          return {
            value: option,
            label: option
          };
        });
        return (
          <Column alignStart={true} key={label}>
            <Row>
              <SelectFieldWidget
                label={label}
                initialValue={initialData}
                suggestions={enums}
                editable={false}
                isMulti={true}
                readOnly={false} // Set to true if the field should be read-only
                onChange={(value: string[] | string) => {
                  updateFormData(path, value);
                }}
              />
            </Row>
          </Column>
        );
      } else {
        const enums = options.map((option) => {
          return {
            id: option,
            text: option,
            className: '',
          };
        });
        return (
          <Column alignStart={true} key={label}>
            <Row>
              <TagsFieldWidget
                label={label}
                initialValue={initialData}
                suggestions={enums}
                editable={false}
                readOnly={false} // Set to true if the field should be read-only
                onDelete={(index: number) => {
                  updateFormData(path, initialData.filter((_, i) => i !== index));
                }}
                onAddition={(tag: Tag) => {
                  updateFormData(path, [...initialData, tag.text]);
                }}
                onDrag={(tag: Tag, currPos: number, newPos: number) => {
                  updateFormData(path, initialData.map((item, index) => index === currPos ? initialData[newPos] : (index === newPos ? initialData[currPos] : item)));
                }}
                onUpdate={(index: number, newTag: Tag) => {
                  updateFormData(path, initialData.map((item, i) => i === index ? newTag.text : item));
                }}
              />
            </Row>
          </Column>
        );
      }
    } else {
      return (
        <Column alignStart={true} key={label}>
          <Row>
            <TagsFieldWidget
              label={label}
              editable={true}
              initialValue={initialData}
              readOnly={false} // Set to true if the field should be read-only
              onDelete={(index: number) => {
                updateFormData(path, initialData.filter((_, i) => i !== index));
              }}
              onAddition={(tag: Tag) => {
                updateFormData(path, [...initialData, tag.text]);
              }}
              onDrag={(tag: Tag, currPos: number, newPos: number) => {
                updateFormData(path, initialData.map((item, index) => index === currPos ? initialData[newPos] : (index === newPos ? initialData[currPos] : item)));
              }}
              onUpdate={(index: number, newTag: Tag) => {
                updateFormData(path, initialData.map((item, i) => i === index ? newTag.text : item));
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
            const uniqueItems = property.items.uniqueItems ? true : false;
            return renderArrayStringProperty(
              label,
              childPath,
              initialValue as string[],
              uniqueItems,
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