import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import '@vscode/codicons/dist/codicon.css';
import './Icon.css'; // Assuming you have additional styles for the widget

interface Link {
  $id: string;
  $label: string;
  $icon: string;
}

interface Block {
  type: 'text' | 'link';
  content: string | Link;
}

function BlockItem({
  block,
  index,
  onRemove,
}: {
  block: Block;
  index: number;
  onRemove: (index: number) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        paddingRight: '25px',
        marginRight: '5px',
        backgroundColor: block.type === 'text' ? '#444' : '#666',
        color: '#eee',
        borderRadius: '4px',
        position: 'relative',
        marginTop: '4px',
      }}
    >
      {block.type === 'link' ? (
        <>
          <div
            className={`codicon codicon-${(block.content as Link).$icon}`}
            style={{ marginRight: '4px' }}
          ></div>
          {(block.content as Link).$label}
        </>
      ) : (
        block.content as string
      )}
      <span
        style={{
          position: 'absolute',
          top: '50%',
          right: '4px',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          lineHeight: '16px',
          borderRadius: '50%',
          backgroundColor: '#999',
          color: '#fff',
          textAlign: 'center',
          cursor: 'pointer',
        }}
        onClick={() => onRemove(index)}
      >
        ×
      </span>
    </div>
  );
}

export function InputStringWidget() {
  const [values, setValues] = useState<string[]>(['']); // Array of values for each input field
  const [blocks, setBlocks] = useState<Block[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]); // Array of refs for each input

  const handleInputChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const newValues = [...values];
    newValues[index] = e.target.value;
    setValues(newValues);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBlock(index);
    }
  };

  const addBlock = (index: number) => {
    const inputValue = values[index];
    if (inputValue.trim()) {
      let newBlocks = [...blocks];
      if (inputValue.trim().startsWith('@')) {
        const [id, ...labelParts] = inputValue.slice(1).split(' ');
        const label = labelParts.join(' ');
        const newLink: Link = { $id: id, $label: label, $icon: 'link-icon' };
        newBlocks = [
          ...blocks.slice(0, index),
          { type: 'link', content: newLink },
          ...blocks.slice(index),
        ];
      } else {
        newBlocks = [
          ...blocks.slice(0, index),
          { type: 'text', content: inputValue.trim() },
          ...blocks.slice(index),
        ];
      }
      setBlocks(newBlocks);

      // Reset the input values, and add a new empty input after the inserted block
      const newValues = [...values];
      newValues[index] = '';
      newValues.splice(index + 1, 0, ''); // Add a new input after the current one
      setValues(newValues);

      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleBlur = (index: number) => {
    addBlock(index);
  };

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);

    // Remove the corresponding input field
    const newValues = [...values];
    newValues.splice(index, 1);
    setValues(newValues);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        border: '1px solid #444',
        padding: '4px',
        borderRadius: '4px',
        backgroundColor: '#333',
      }}
    >
      {blocks.map((block, index) => (
        <React.Fragment key={index}>
          <BlockItem block={block} index={index} onRemove={removeBlock} />
          <input
            ref={(el) => (inputRefs.current[index + 1] = el)} // +1 to handle the input after each block
            type="text"
            value={values[index + 1] || ''} // Use index + 1 because inputs are between blocks
            onChange={(e) => handleInputChange(index + 1, e)}
            onKeyDown={(e) => handleKeyDown(index + 1, e)}
            onBlur={() => handleBlur(index + 1)}
            style={{
              flex: '1',
              border: 'none',
              padding: '8px',
              backgroundColor: '#333',
              color: '#eee',
              fontSize: '14px',
              lineHeight: '24px',
              outline: 'none',
              marginRight: '5px', // Add some spacing between inputs
            }}
          />
        </React.Fragment>
      ))}
      {/* Initial input field or the one after all blocks */}
      <input
        ref={(el) => (inputRefs.current[0] = el)}
        type="text"
        value={values[0] || ''}
        onChange={(e) => handleInputChange(0, e)}
        onKeyDown={(e) => handleKeyDown(0, e)}
        onBlur={() => handleBlur(0)}
        style={{
          flex: '1',
          border: 'none',
          padding: '8px',
          backgroundColor: '#333',
          color: '#eee',
          fontSize: '14px',
          lineHeight: '24px',
          outline: 'none',
          marginRight: '5px',
        }}
      />
    </div>
  );
}