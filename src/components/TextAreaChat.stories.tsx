import type { Decorator, Meta, StoryObj } from '@storybook/react';
import TextAreaChat from './TextAreaChat';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div style={{ width: '100%', height: '300px', background: '#1a1a1a' }}>
    <Story />
  </div>
);

const meta = {
  component: TextAreaChat,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    type: { control: 'select', options: ['parametric', 'creative'] },
    isLoading: { control: 'boolean' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    showPromptGenerator: { control: 'boolean' },
    showFullLabels: { control: 'boolean' },
  },
} satisfies Meta<typeof TextAreaChat>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'creative',
    isLoading: false,
    placeholder: 'What can Adam help you build today?',
    disabled: false,
    showPromptGenerator: true,
    showFullLabels: false,
  },
};

export const Disabled: Story = {
  args: {
    type: 'creative',
    isLoading: false,
    placeholder: 'What can Adam help you build today?',
    disabled: true,
    showPromptGenerator: true,
    showFullLabels: false,
  },
};

export const Creative: Story = {
  args: {
    type: 'creative',
    isLoading: false,
    placeholder: 'Make a production ready 3D asset...',
    disabled: false,
    showPromptGenerator: true,
    showFullLabels: true,
  },
};
