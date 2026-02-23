import React from 'react';
import { Share, Printer, X } from 'lucide-react';

export default function ReceiptModal({ bet, onClose }) {
    if (!bet) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const textToShare = `WETENG DIGITAL\nReceipt: ${bet.papelito}\nDate: ${new Date(bet.createdAt).toLocaleString('en-PH')}\nNumbers: ${bet.numbers.num1} - ${bet.numbers.num2}\nAmount: ₱${bet.amount}\nBettor: ${bet.bettorName || 'Walk-in'}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Weteng Bet Receipt',
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

    return (
        <div className="receipt-modal-backdrop">
            <div className="receipt-modal-content">
                <button className="receipt-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Printable Area */}
                <div id="print-area" className="thermal-receipt">
                    <div className="receipt-header">
                        <h2>WETENG</h2>
                        <p>Digital Platform</p>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-row">
                        <span>Papelito:</span>
                        <strong>{bet.papelito}</strong>
                    </div>
                    <div className="receipt-row">
                        <span>Date:</span>
                        <span>{new Date(bet.createdAt).toLocaleString('en-PH')}</span>
                    </div>
                    <div className="receipt-row">
                        <span>Agent/Station:</span>
                        <span>{bet.kubrador?.fullName || 'System'}</span>
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

                    <div className="receipt-footer">
                        <p>Betting strictly for adults.</p>
                        <p>Keep this papelito safe.</p>
                        <p className="barcode-placeholder">{bet.papelito}</p>
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
