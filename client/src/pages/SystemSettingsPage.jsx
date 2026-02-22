import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { updateSettings } from '../api';
import { Settings, Save, Clock, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function SystemSettingsPage() {
    const { settings } = useSettings();

    // Local copy of settings for editing
    const [localSettings, setLocalSettings] = useState({
        maxNumber: 37,
        payoutMultiplier: 400,
        pompyangMultiplier: 800,
        drawSchedule: ['11:00 AM', '04:00 PM', '09:00 PM']
    });
    const [isSaving, setIsSaving] = useState(false);
    const [newTime, setNewTime] = useState('');

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddTime = () => {
        if (!newTime) return;
        const [hh, mm] = newTime.split(':');
        const hour = parseInt(hh, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        const formattedTime = `${formattedHour.toString().padStart(2, '0')}:${mm} ${ampm}`;

        if (!localSettings.drawSchedule.includes(formattedTime)) {
            setLocalSettings(prev => ({
                ...prev,
                drawSchedule: [...prev.drawSchedule, formattedTime].sort((a, b) => new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b))
            }));
            setNewTime('');
        }
    };

    const handleRemoveTime = (timeToRemove) => {
        setLocalSettings(prev => ({
            ...prev,
            drawSchedule: prev.drawSchedule.filter(t => t !== timeToRemove)
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await updateSettings({
                maxNumber: Number(localSettings.maxNumber),
                payoutMultiplier: Number(localSettings.payoutMultiplier),
                pompyangMultiplier: Number(localSettings.pompyangMultiplier),
                drawSchedule: localSettings.drawSchedule
            });
            Swal.fire({
                title: 'Success',
                text: 'System settings updated successfully. All connected users will see changes immediately.',
                icon: 'success',
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#00BFA5'
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className="card-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">System Settings</h1>
                    <p className="page-subtitle">Configure global variables to control dynamic behavior</p>
                </div>
                <Settings size={28} style={{ color: 'var(--gold)' }} />
            </div>

            <div className="grid-2">
                {/* General Settings */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Game Variables</div>
                            <div className="card-subtitle">Adjust the mechanics of the game</div>
                        </div>
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            Max Number (Draw Range)
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            value={localSettings.maxNumber}
                            onChange={(e) => handleChange('maxNumber', e.target.value)}
                            min="1"
                            style={{ width: '100%', background: 'var(--bg-body)', padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                        />
                        <small style={{ color: 'var(--text-muted)' }}>Sets the boundary of choices (e.g., 1 to 37, or 1 to 40).</small>
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            Standard Payout Multiplier
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            value={localSettings.payoutMultiplier}
                            onChange={(e) => handleChange('payoutMultiplier', e.target.value)}
                            min="1"
                            style={{ width: '100%', background: 'var(--bg-body)', padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                        />
                        <small style={{ color: 'var(--text-muted)' }}>E.g., 400x payout for regular winning pairs.</small>
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            Pompyang Payout Multiplier
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            value={localSettings.pompyangMultiplier}
                            onChange={(e) => handleChange('pompyangMultiplier', e.target.value)}
                            min="1"
                            style={{ width: '100%', background: 'var(--bg-body)', padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                        />
                        <small style={{ color: 'var(--text-muted)' }}>E.g., 800x payout for identical number pairs (Pompyang).</small>
                    </div>
                </div>

                {/* Schedule Settings */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Draw Schedule</div>
                            <div className="card-subtitle">Set times for automatic draws countdown</div>
                        </div>
                        <Clock size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {localSettings.drawSchedule.map((time, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px'
                            }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '16px', color: 'var(--gold)' }}>{time}</span>
                                <button className="btn btn-sm btn-outline" onClick={() => handleRemoveTime(time)} style={{ border: 'none', padding: '6px' }}>
                                    <Trash2 size={16} color="var(--red-light)" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="time"
                            className="form-control"
                            style={{ flex: 1, background: 'var(--bg-body)', padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white' }}
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                        />
                        <button className="btn btn-outline" onClick={handleAddTime}>Add Time</button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'right' }}>
                <button
                    className="btn btn-gold btn-lg"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ width: '200px' }}
                >
                    {isSaving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                </button>
            </div>
        </div>
    );
}
