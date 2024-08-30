/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { StyleXVar } from '@stylexjs/stylex/lib/StyleXTypes';
import { FormContainer } from './FormContainer';

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
        type: "string"
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
  return (
    <div>
      <h2>Editor View</h2>
      <FormContainer schema={schema} initialData={initialData} />;
    </div>
  );
}