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
    name: { type: 'string' },
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
    array: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
};

const initialData = {
  name: 'John Doe',
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
  array: ["hola", "adios"]
};


//const schema = {
//  properties: {
//    name: { type: 'string' },
//    description: { type: 'string', multiline: true },
//    isActive: { type: 'boolean' },
//    settings: {
//      type: 'object',
//      properties: {
//        theme: { type: 'string' },
//        notifications: { type: 'boolean' },
//        settings: {
//          type: 'object',
//          properties: {
//            theme: { type: 'string' },
//            notifications: { type: 'boolean' },
//          },
//        },
//      },
//    },
//    array: {
//      type: "array",
//      items: {
//        type: "object",
//        properties: {
//          theme: { type: 'string' },
//          notifications: { type: 'boolean' },
//          settings: {
//            type: 'object',
//            properties: {
//              theme: { type: 'string' },
//              notifications: { type: 'boolean', hidden: true },
//            },
//          },
//        },
//      }
//    }
//  },
//};
//
//const initialData = {
//  name: 'John Doe',
//  description: 'A description here',
//  isActive: true,
//  settings: {
//    theme: 'dark',
//    notifications: false,
//    settings: {
//      theme: 'dark',
//      notifications: false,
//    },
//  },
//  array: [{
//    theme: 'dark',
//    notifications: false,
//    settings: {
//      theme: 'dark',
//      notifications: false,
//    }
//  },
//  {
//    theme: 'light',
//    notifications: true,
//    settings: {
//      theme: 'io',
//      notifications: false,
//    }
//  }]
//};



export default function EditorView() {
  return (
    <div>
      <h2>Editor View</h2>
      <FormContainer schema={schema} initialData={initialData} />;
    </div>
  );
}