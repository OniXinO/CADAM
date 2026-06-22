import type { Meta, StoryObj } from '@storybook/react';
import { ParameterSheetContent } from './ParameterSheetContent';

const meta = {
  component: ParameterSheetContent,
  tags: ['autodocs'],
  argTypes: {
    code: { control: 'text' },
  },
} satisfies Meta<typeof ParameterSheetContent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: `// Hexagonal planter with drainage
module hexagonal_planter(width=80, height=120, wall_thickness=3) {
  difference() {
    cylinder(h=height, r=width/2, $fn=6);
    translate([0, 0, wall_thickness])
      cylinder(h=height-wall_thickness, r=(width-2*wall_thickness)/2, $fn=6);
  }
}`,
  },
};
