import React from 'react';
import { Share, Printer, X } from 'lucide-react';
import Barcode from 'react-barcode';

export default function ReceiptModal({ bet, onClose }) {
    if (!bet) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const textToShare = `ONLINE WETENG\nReceipt: ${bet.papelito}\nDate: ${new Date(bet.createdAt || Date.now()).toLocaleString('en-PH')}\nNumbers: ${bet.numbers.num1} - ${bet.numbers.num2}\nAmount: ₱${bet.amount}\nBettor: ${bet.bettorName || 'Walk-in'}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Online Weteng Bet Receipt',
                    text: textToShare,
                });
            } catch (error) {
                console.error('Error sharing', error);
            }
        } else {
            navigator.clipboard.writeText(textToShare);
            alert('Receipt details copied to clipboard!');
        }
    };

    const agentName = bet.kubradorId?.fullName || bet.kubrador?.fullName || 'System';
    const displayAgent = (agentName.toLowerCase().includes('admin') || agentName === 'System') ? 'Main Station' : agentName;

    return (
        <div className="receipt-modal-backdrop">
            <div className="receipt-modal-content">
                <button className="receipt-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Printable Area */}
                <div id="print-area" className="thermal-receipt">
                    <div className="receipt-header">
                        <h2>ONLINE WETENG</h2>
                        <p>Digital Platform</p>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-row">
                        <span>Ref No:</span>
                        <strong>{bet.papelito}</strong>
                    </div>
                    <div className="receipt-row">
                        <span>Date:</span>
                        <span>{new Date(bet.createdAt || Date.now()).toLocaleString('en-PH')}</span>
                    </div>
                    <div className="receipt-row">
                        <span>Agent/Station:</span>
                        <span>{displayAgent}</span>
                    </div>
                    <div className="receipt-row">
                        <span>Bettor Name:</span>
                        <span>{bet.bettorName || 'Walk-in'}</span>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-numbers-container">
                        <div className="receipt-number-pair">
                            <span>{bet.numbers.num1}</span>
                            <span>-</span>
                            <span>{bet.numbers.num2}</span>
                        </div>
                        {bet.isPompyang && <div className="receipt-pompyang">⚡ POMPYANG</div>}
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-row total">
                        <span>AMOUNT:</span>
                        <span>₱{bet.amount.toLocaleString()}</span>
                    </div>
                    <div className="receipt-row">
                        <span>EST. WIN:</span>
                        <span>₱{bet.potentialPayout?.toLocaleString()}</span>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-footer" style={{ textAlign: 'left', marginTop: '20px' }}>
                        <div className="barcode-wrapper" style={{ justifyContent: 'flex-start', margin: 0 }}>
                            <Barcode
                                value={bet.papelito || 'REF-0000'}
                                width={1.5}
                                height={70}
                                fontSize={14}
                                textMargin={8}
                                displayValue={true}
                                background="#ffffff"
                                lineColor="#000000"
                                margin={0}
                            />
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '16px', letterSpacing: '0.5px' }}>
                            {bet.papelito || 'REF-0000'}
                        </div>
                    </div>
                </div>

                {/* Actions (Not Printable) */}
                <div className="receipt-actions no-print">
                    <button className="btn btn-gold" onClick={handlePrint} style={{ flex: 1 }}>
                        <Printer size={16} /> Print
                    </button>
                    <button className="btn btn-outline" onClick={handleShare} style={{ flex: 1 }}>
                        <Share size={16} /> Share
                    </button>
                </div>
            </div>
        </div>
    );
}
