import React, { useState } from 'react';
import MotorcycleCard from './MotorcycleCard';
import { Search, Plus } from 'lucide-react';

const MOCK_MOTOS = [
  {
    id: 'M-001',
    name: 'Benelli 180S',
    client: 'Juan Valdez',
    image: '/images/motos/benelli180.png',
    status: 'In Repair',
    specs: { displacement: '175cc', mileage: '1,200' }
  },
  {
    id: 'M-002',
    name: 'Benelli Imperiale 400',
    client: 'Mateo Sanchez',
    image: '/images/motos/benelli-imperiale400.png',
    status: 'Ready',
    specs: { displacement: '374cc', mileage: '500' }
  },
  {
    id: 'M-003',
    name: 'Advance R 110',
    client: 'Laura Ortega',
    image: '/images/motos/advanceR-110.png',
    status: 'Pending',
    specs: { displacement: '110cc', mileage: '15,000' }
  },
  {
    id: 'M-004',
    name: 'Agility 125',
    client: 'Pedro Gomez',
    image: '/images/motos/agility-125.png',
    status: 'In Repair',
    specs: { displacement: '125cc', mileage: '8,400' }
  },
  {
    id: 'M-005',
    name: 'Agility Go',
    client: 'Ana Rios',
    image: '/images/motos/agility-go.png',
    status: 'Ready',
    specs: { displacement: '125cc', mileage: '2,100' }
  },
  {
    id: 'M-006',
    name: 'Zontes 368G',
    client: 'Luis Cano',
    image: '/images/motos/zontes-368g.png',
    status: 'Pending',
    specs: { displacement: '368cc', mileage: '0' }
  },
  {
    id: 'M-007',
    name: 'MRX 150',
    client: 'David Luna',
    image: '/images/motos/mrx-150.png',
    status: 'In Repair',
    specs: { displacement: '150cc', mileage: '10,200' }
  },
  {
    id: 'M-008',
    name: 'MRX Arizona',
    client: 'Carlos Vega',
    image: '/images/motos/MRX-Arizona.png',
    status: 'Ready',
    specs: { displacement: '200cc', mileage: '4,500' }
  },
  {
    id: 'M-009',
    name: 'Ninja 400',
    client: 'Jorge Ruiz',
    image: '/images/motos/ninja-400.png',
    status: 'Pending',
    specs: { displacement: '399cc', mileage: '1,500' }
  },
  {
    id: 'M-010',
    name: 'TVS Raider 125',
    client: 'Marta Diaz',
    image: '/images/motos/tvs-raider125.png',
    status: 'In Repair',
    specs: { displacement: '125cc', mileage: '6,700' }
  },
  {
    id: 'M-011',
    name: 'TVS Sport 100',
    client: 'Jose Lopez',
    image: '/images/motos/tvs-sport100.png',
    status: 'Ready',
    specs: { displacement: '100cc', mileage: '22,000' }
  },
  {
    id: 'M-012',
    name: 'TVS Apache 200RR',
    client: 'Elena Mar',
    image: '/images/motos/tvs-apachertr-200.png',
    status: 'Pending',
    specs: { displacement: '197cc', mileage: '3,400' }
  }
];

const MotorcycleList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredMotos = MOCK_MOTOS.filter(moto => 
    moto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    moto.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    moto.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col p-6 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-auteco-blue">Motorcycles</h2>
        <button className="bg-auteco-red text-white p-2 rounded-full shadow-lg shadow-auteco-red/30 hover:scale-110 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cliente o ID..."
          className="w-full bg-white border-none rounded-xl py-3 pl-12 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-auteco-blue transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-8">
        {filteredMotos.map(moto => (
          <MotorcycleCard key={moto.id} {...moto} />
        ))}
      </div>
    </div>
  );
};

export default MotorcycleList;
