import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Stethoscope, Microscope, Pill, UserCheck } from 'lucide-react';

const Departments = () => {
    const navigate = useNavigate();

    const departments = [
        {
            id: 'ipd',
            title: 'IPD',
            description: 'Inpatient Department',
            icon: Heart,
            path: '/dashboard',
            color: 'text-red-500'
        },
        {
            id: 'opd',
            title: 'OPD',
            description: 'Outpatient Department',
            icon: Stethoscope,
            path: null,
            color: 'text-blue-500'
        },
        {
            id: 'pathology',
            title: 'Pathology Lab',
            description: 'Pathology Services',
            icon: Microscope,
            path: null,
            color: 'text-green-500'
        },
        {
            id: 'pharmacy',
            title: 'Pharmacy',
            description: 'Pharmacy Services',
            icon: Pill,
            path: null,
            color: 'text-purple-500'
        },
        {
            id: 'reception',
            title: 'Reception',
            description: 'Reception Services',
            icon: UserCheck,
            path: null,
            color: 'text-orange-500'
        }
    ];

    const handleCardClick = (path) => {
        if (path) {
            navigate(path);
        } else {
            alert(`Dummy Card for ${departments.find(d => d.path === null)?.title || 'Department'}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Select a Department</h1>
                    <p className="text-lg text-gray-600">Choose the department you want to access</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map((dept) => {
                        const IconComponent = dept.icon;
                        return (
                            <Card 
                                key={dept.id} 
                                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-0 shadow-md bg-white/80 backdrop-blur-sm"
                                onClick={() => handleCardClick(dept.path)}
                            >
                                <CardHeader className="text-center pb-4">
                                    <div className="flex justify-center mb-4">
                                        <div className={`p-3 rounded-full bg-gray-100 ${dept.color}`}>
                                            <IconComponent size={32} />
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-semibold text-gray-800">
                                        {dept.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-gray-600 mb-4">{dept.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Departments;
