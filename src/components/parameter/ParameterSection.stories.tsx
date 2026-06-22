import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { ParameterSection } from './ParameterSection';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div
    style={{
      height: '600px',
      width: '100%',
      display: 'flex',
      backgroundColor: '#0a0a0a',
    }}
  >
    <Story />
  </div>
);

const meta = {
  component: ParameterSection,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    code: { control: 'text' },
  },
} satisfies Meta<typeof ParameterSection>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: 'cube([20, 20, 20]);',
  },
};
