import { useState, useMemo } from 'react';
import {
  Modal,
  TextInput,
  SimpleGrid,
  ActionIcon,
  Text,
  Stack,
  Tabs,
  ScrollArea,
  Tooltip,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import {
  IconCreditCard,
  IconHome,
  IconBulb,
  IconDroplet,
  IconFlame,
  IconWifi,
  IconCar,
  IconGasStation,
  IconShoppingCart,
  IconToolsKitchen2,
  IconPill,
  IconHeartbeat,
  IconDeviceTv,
  IconMusic,
  IconMovie,
  IconDeviceGamepad2,
  IconPhone,
  IconSchool,
  IconBuildingBank,
  IconReceipt,
  IconWallet,
  IconCoin,
  IconCash,
  IconPigMoney,
  IconReportMoney,
  IconShield,
  IconLock,
  IconBriefcase,
  IconBuilding,
  IconPlane,
  IconBus,
  IconBike,
  IconRun,
  IconSwimming,
  IconBarbell,
  IconCut,
  IconDog,
  IconCat,
  IconBabyCarriage,
  IconGift,
  IconCake,
  IconBottle,
  IconCoffee,
  IconPizza,
  IconBeer,
  IconGlassFull,
  IconSun,
  IconMoon,
  IconCloud,
  IconUmbrella,
  IconTree,
  IconLeaf,
  IconBallFootball,
  IconBallBaseball,
  IconBallBasketball,
  IconBallTennis,
  IconBallVolleyball,
  IconPlayFootball,
  IconGolf,
  IconTrophy,
} from '@tabler/icons-react';
import type { IconProps } from '@tabler/icons-react';

interface IconDefinition {
  name: string;
  component: React.ComponentType<IconProps>;
  label: string;
  category: string;
}

const icons: IconDefinition[] = [
  // Finance
  { name: 'payment', component: IconCreditCard, label: 'Credit Card', category: 'Finance' },
  { name: 'account_balance', component: IconBuildingBank, label: 'Bank', category: 'Finance' },
  { name: 'account_balance_wallet', component: IconWallet, label: 'Wallet', category: 'Finance' },
  { name: 'attach_money', component: IconCoin, label: 'Coin', category: 'Finance' },
  { name: 'monetization_on', component: IconCash, label: 'Cash', category: 'Finance' },
  { name: 'savings', component: IconPigMoney, label: 'Savings', category: 'Finance' },
  { name: 'currency_exchange', component: IconReportMoney, label: 'Exchange', category: 'Finance' },
  { name: 'receipt', component: IconReceipt, label: 'Receipt', category: 'Finance' },

  // Home & Utilities
  { name: 'home', component: IconHome, label: 'Home', category: 'Home' },
  { name: 'lightbulb', component: IconBulb, label: 'Electricity', category: 'Home' },
  { name: 'water_drop', component: IconDroplet, label: 'Water', category: 'Home' },
  { name: 'local_fire_department', component: IconFlame, label: 'Gas/Heating', category: 'Home' },
  { name: 'wifi', component: IconWifi, label: 'Internet/WiFi', category: 'Home' },
  { name: 'cable', component: IconDeviceTv, label: 'Cable/TV', category: 'Home' },

  // Transportation
  { name: 'directions_car', component: IconCar, label: 'Car', category: 'Transport' },
  { name: 'local_gas_station', component: IconGasStation, label: 'Gas Station', category: 'Transport' },
  { name: 'flight', component: IconPlane, label: 'Flight', category: 'Transport' },
  { name: 'bus', component: IconBus, label: 'Bus/Transit', category: 'Transport' },
  { name: 'pedal_bike', component: IconBike, label: 'Bike', category: 'Transport' },

  // Shopping & Food
  { name: 'shopping_cart', component: IconShoppingCart, label: 'Shopping', category: 'Shopping' },
  { name: 'restaurant', component: IconToolsKitchen2, label: 'Restaurant', category: 'Shopping' },
  { name: 'local_pizza', component: IconPizza, label: 'Food Delivery', category: 'Shopping' },
  { name: 'local_cafe', component: IconCoffee, label: 'Coffee', category: 'Shopping' },
  { name: 'local_bar', component: IconBeer, label: 'Bar', category: 'Shopping' },
  { name: 'cake', component: IconCake, label: 'Bakery', category: 'Shopping' },
  { name: 'local_drink', component: IconBottle, label: 'Drinks', category: 'Shopping' },
  { name: 'wine', component: IconGlassFull, label: 'Wine', category: 'Shopping' },

  // Health & Fitness
  { name: 'medical_services', component: IconHeartbeat, label: 'Healthcare', category: 'Health' },
  { name: 'local_pharmacy', component: IconPill, label: 'Pharmacy', category: 'Health' },
  { name: 'fitness_center', component: IconBarbell, label: 'Gym', category: 'Health' },
  { name: 'spa', component: IconLeaf, label: 'Wellness', category: 'Health' },
  { name: 'pool', component: IconSwimming, label: 'Swimming', category: 'Health' },
  { name: 'hiking', component: IconRun, label: 'Running', category: 'Health' },

  // Sports (Kids Activities)
  { name: 'soccer', component: IconPlayFootball, label: 'Soccer', category: 'Sports' },
  { name: 'football', component: IconBallFootball, label: 'Football', category: 'Sports' },
  { name: 'baseball', component: IconBallBaseball, label: 'Baseball', category: 'Sports' },
  { name: 'basketball', component: IconBallBasketball, label: 'Basketball', category: 'Sports' },
  { name: 'tennis', component: IconBallTennis, label: 'Tennis', category: 'Sports' },
  { name: 'volleyball', component: IconBallVolleyball, label: 'Volleyball', category: 'Sports' },
  { name: 'golf', component: IconGolf, label: 'Golf', category: 'Sports' },
  { name: 'trophy', component: IconTrophy, label: 'Trophy/Award', category: 'Sports' },

  // Entertainment
  { name: 'movie', component: IconMovie, label: 'Movies', category: 'Entertainment' },
  { name: 'music_note', component: IconMusic, label: 'Music', category: 'Entertainment' },
  { name: 'tv', component: IconDeviceTv, label: 'Streaming', category: 'Entertainment' },
  { name: 'videogame_asset', component: IconDeviceGamepad2, label: 'Gaming', category: 'Entertainment' },
  { name: 'gift', component: IconGift, label: 'Gift', category: 'Entertainment' },

  // Technology
  { name: 'phone', component: IconPhone, label: 'Phone', category: 'Tech' },

  // Work & Education
  { name: 'school', component: IconSchool, label: 'School', category: 'Work' },
  { name: 'work', component: IconBriefcase, label: 'Work', category: 'Work' },
  { name: 'business', component: IconBuilding, label: 'Business', category: 'Work' },

  // Insurance & Security
  { name: 'security', component: IconShield, label: 'Insurance', category: 'Insurance' },
  { name: 'lock', component: IconLock, label: 'Security', category: 'Insurance' },

  // Personal
  { name: 'content_cut', component: IconCut, label: 'Haircut', category: 'Personal' },
  { name: 'pets', component: IconDog, label: 'Dog/Pet', category: 'Personal' },
  { name: 'cat', component: IconCat, label: 'Cat', category: 'Personal' },
  { name: 'child_care', component: IconBabyCarriage, label: 'Childcare', category: 'Personal' },

  // Nature
  { name: 'sun', component: IconSun, label: 'Sun', category: 'Nature' },
  { name: 'moon', component: IconMoon, label: 'Moon', category: 'Nature' },
  { name: 'cloud', component: IconCloud, label: 'Cloud', category: 'Nature' },
  { name: 'umbrella', component: IconUmbrella, label: 'Umbrella', category: 'Nature' },
  { name: 'tree', component: IconTree, label: 'Tree', category: 'Nature' },
];

const categories = [
  'All',
  'Finance',
  'Home',
  'Transport',
  'Shopping',
  'Health',
  'Sports',
  'Entertainment',
  'Tech',
  'Work',
  'Insurance',
  'Personal',
  'Nature',
];

interface IconPickerProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
}

export function IconPicker({ opened, onClose, onSelect, currentIcon }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredIcons = useMemo(() => {
    return icons.filter((icon) => {
      const matchesSearch =
        search === '' ||
        icon.label.toLowerCase().includes(search.toLowerCase()) ||
        icon.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || icon.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    onClose();
    setSearch('');
    setActiveCategory('All');
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Choose an Icon"
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search icons..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <Tabs value={activeCategory} onChange={(val) => setActiveCategory(val || 'All')}>
          <Tabs.List>
            {categories.slice(0, 6).map((cat) => (
              <Tabs.Tab key={cat} value={cat}>
                {cat}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.List>
            {categories.slice(6).map((cat) => (
              <Tabs.Tab key={cat} value={cat}>
                {cat}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <ScrollArea h={300}>
          <SimpleGrid cols={6} spacing="xs">
            {filteredIcons.map((icon) => {
              const IconComponent = icon.component;
              const isSelected = icon.name === currentIcon;
              return (
                <Tooltip key={icon.name} label={icon.label} position="top">
                  <ActionIcon
                    variant={isSelected ? 'filled' : 'light'}
                    color={isSelected ? 'violet' : 'gray'}
                    size="xl"
                    onClick={() => handleSelect(icon.name)}
                  >
                    <IconComponent size={24} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </SimpleGrid>

          {filteredIcons.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              No icons found matching "{search}"
            </Text>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
