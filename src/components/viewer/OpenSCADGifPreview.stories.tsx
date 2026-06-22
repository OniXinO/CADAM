import type { Meta, StoryObj } from '@storybook/react';
import { OpenSCADGifPreview } from './OpenSCADGifPreview';

const meta = {
  component: OpenSCADGifPreview,
  tags: ['autodocs'],
  argTypes: {
    code: { control: 'text' },
  },
} satisfies Meta<typeof OpenSCADGifPreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: `module rounded_cube(size = 10, radius = 1) {
  minkowski() {
    cube([size - 2*radius, size - 2*radius, size - 2*radius], center = true);
    sphere(r = radius);
  }
}

color([0.2, 0.8, 1.0])
rounded_cube(size = 20, radius = 2);`,
  },
};
