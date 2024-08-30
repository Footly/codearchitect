/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { StyleXVar } from '@stylexjs/stylex/lib/StyleXTypes';
import { FormContainer } from './FormContainer';
import React, {useState, useCallback, useMemo} from "react";
import SimpleMDE from "react-simplemde-editor";
import SimpleMdeReact from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

const schema = {
  properties: {
    name: {
      type: 'string',
      enum: [
        "hola",
        "adeu"
      ]
    },
    description: { type: 'string', multiline: true },
    isActive: { type: 'boolean' },
    settings: {
      type: 'object',
      properties: {
        theme: { type: 'string' },
        notifications: { type: 'boolean' },
        settings: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            notifications: { type: 'boolean' },
          },
        },
      },
    },
    object: {
      type: "object",
      properties: {
        name: {
          type: "array",
          items: {
            type: "string"
          }
        },
        age: {
          type: "string"
        }
      }
    },
    options: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "caca",
          "none",
          "aiaia"
        ],
        uniqueItems: true
      }
    }
  },
};

const initialData = {
  name: 'hola',
  description: 'A description here',
  isActive: true,
  settings: {
    theme: 'dark',
    notifications: false,
    settings: {
      theme: 'dark',
      notifications: false,
    },
  },
  object: {
    name: ['John', 'Doe'],
    age: 30
  },
  options: []
};

export default function EditorView() {
  const [value, setValue] = useState("Initial value");
  const autofocusNoSpellcheckerOptions = useMemo(() => {
    return {
      autofocus: true,
      hideIcons: ["side-by-side", "fullscreen", "guide", "quote"],
      toolbar: [
        "heading",
        "bold",
        "italic",
        "|",
        "unordered-list",
        "ordered-list",
        "table",
        "|",
        {
          name: "idLink",
          action: (editor) => {
            console.warn(editor);
          },
          className: "fa fa-hashtag"
        },
        "link",
        "image",
        "preview"

      ]
    } as SimpleMDE.Options;
  }, []);

  const onChange = useCallback((value: string) => {
    console.log(value);
    setValue(value);
  }, []);
  return (
    <div>
      <h2>Editor View</h2>
      <SimpleMdeReact
      options={autofocusNoSpellcheckerOptions}
      value={value}
      onChange={onChange}
    />;
      <FormContainer schema={schema} initialData={initialData} />;
    </div>
  );
}