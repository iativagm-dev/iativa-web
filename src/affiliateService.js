const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AffiliateService {
    constructor() {
        this.affiliatesFile = path.join(__dirname, '../data/affiliates.json');
        this.commissionsFile = path.join(__dirname, '../data/commissions.json');
        this.referralsFile = path.join(__dirname, '../data/referrals.json');
        
        this.initializeFiles();
        
        this.commissionRates = {
            firstSale: 30,      // 30% primera venta
            recurring: 15,      // 15% ventas recurrentes  
            secondLevel: 10,    // 10% segundo nivel
            bonuses: {
                monthly: { sales: 10, amount: 50000 },      // $50k si >10 ventas/mes
                quarterly: { sales: 100, amount: 200000 }    // $200k si >100 ventas trimestre
            }
        };
    }

    initializeFiles() {
        [this.affiliatesFile, this.commissionsFile, this.referralsFile].forEach(file => {
            if (!fs.existsSync(file)) {
                fs.writeFileSync(file, '[]', 'utf8');
            }
        });
    }

    // Crear nuevo afiliado
    async crearAfiliado(userData) {
        const affiliates = this.loadAffiliates();
        
        const affiliate = {
            id: uuidv4(),
            codigo: this.generarCodigoAfiliado(userData.name),
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            bank_account: userData.bank_account || '',
            created_at: new Date().toISOString(),
            status: 'active',
            stats: {
                total_referrals: 0,
                total_sales: 0,
                total_commissions: 0,
                current_month_sales: 0,
                current_quarter_sales: 0
            },
            payment_info: {
                bank: userData.bank || '',
                account_number: userData.account_number || '',
                account_type: userData.account_type || ''
            }
        };

        affiliates.push(affiliate);
        this.saveAffiliates(affiliates);
        
        return affiliate;
    }

    // Generar código único de afiliado
    generarCodigoAfiliado(name) {
        const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 6);
        const timestamp = Date.now().toString().slice(-4);
        return `IAT_${cleanName}_${timestamp}`;
    }

    // Registrar referido
    async registrarReferido(affiliateCode, referredUserId, saleAmount = 0, saleType = 'subscription') {
        const affiliates = this.loadAffiliates();
        const referrals = this.loadReferrals();
        const commissions = this.loadCommissions();
        
        const affiliate = affiliates.find(a => a.codigo === affiliateCode);
        if (!affiliate) throw new Error('Código de afiliado no válido');

        // Registrar referido
        const referral = {
            id: uuidv4(),
            affiliate_id: affiliate.id,
            affiliate_code: affiliateCode,
            referred_user_id: referredUserId,
            sale_amount: saleAmount,
            sale_type: saleType,
            created_at: new Date().toISOString(),
            status: saleAmount > 0 ? 'converted' : 'pending'
        };

        referrals.push(referral);
        this.saveReferrals(referrals);

        // Si hay venta, calcular comisión
        if (saleAmount > 0) {
            const commission = await this.calcularComision(affiliate, saleAmount, saleType);
            commissions.push(commission);
            this.saveCommissions(commissions);

            // Actualizar estadísticas del afiliado
            affiliate.stats.total_sales += saleAmount;
            affiliate.stats.total_commissions += commission.amount;
            affiliate.stats.current_month_sales += saleAmount;
            affiliate.stats.current_quarter_sales += saleAmount;
            
            if (referral.status === 'converted') {
                affiliate.stats.total_referrals++;
            }

            this.saveAffiliates(affiliates);

            // Verificar bonuses
            await this.verificarBonuses(affiliate);

            return { referral, commission };
        }

        return { referral };
    }

    // Calcular comisión
    async calcularComision(affiliate, saleAmount, saleType) {
        let rate;
        
        if (saleType === 'first_sale') {
            rate = this.commissionRates.firstSale;
        } else if (saleType === 'recurring') {
            rate = this.commissionRates.recurring;
        } else {
            rate = this.commissionRates.firstSale; // Default
        }

        const amount = Math.floor(saleAmount * (rate / 100));

        return {
            id: uuidv4(),
            affiliate_id: affiliate.id,
            sale_amount: saleAmount,
            commission_rate: rate,
            amount: amount,
            type: saleType,
            status: 'pending',
            created_at: new Date().toISOString()
        };
    }

    // Verificar y otorgar bonuses
    async verificarBonuses(affiliate) {
        const commissions = this.loadCommissions();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Bonus mensual
        if (affiliate.stats.current_month_sales >= this.commissionRates.bonuses.monthly.sales) {
            const monthlyBonusExists = commissions.some(c => 
                c.affiliate_id === affiliate.id && 
                c.type === 'monthly_bonus' &&
                new Date(c.created_at).getMonth() === currentMonth &&
                new Date(c.created_at).getFullYear() === currentYear
            );

            if (!monthlyBonusExists) {
                const bonus = {
                    id: uuidv4(),
                    affiliate_id: affiliate.id,
                    amount: this.commissionRates.bonuses.monthly.amount,
                    type: 'monthly_bonus',
                    status: 'approved',
                    created_at: now.toISOString()
                };

                commissions.push(bonus);
                this.saveCommissions(commissions);
            }
        }

        // Bonus trimestral
        const currentQuarter = Math.floor(currentMonth / 3);
        if (affiliate.stats.current_quarter_sales >= this.commissionRates.bonuses.quarterly.sales) {
            const quarterlyBonusExists = commissions.some(c => 
                c.affiliate_id === affiliate.id && 
                c.type === 'quarterly_bonus' &&
                Math.floor(new Date(c.created_at).getMonth() / 3) === currentQuarter &&
                new Date(c.created_at).getFullYear() === currentYear
            );

            if (!quarterlyBonusExists) {
                const bonus = {
                    id: uuidv4(),
                    affiliate_id: affiliate.id,
                    amount: this.commissionRates.bonuses.quarterly.amount,
                    type: 'quarterly_bonus',
                    status: 'approved',
                    created_at: now.toISOString()
                };

                commissions.push(bonus);
                this.saveCommissions(commissions);
            }
        }
    }

    // Obtener datos del afiliado
    obtenerAfiliado(affiliateId) {
        const affiliates = this.loadAffiliates();
        return affiliates.find(a => a.id === affiliateId);
    }

    // Obtener afiliado por código
    obtenerAfiliadoPorCodigo(codigo) {
        const affiliates = this.loadAffiliates();
        return affiliates.find(a => a.codigo === codigo);
    }

    // Obtener dashboard del afiliado
    obtenerDashboardAfiliado(affiliateId) {
        const affiliate = this.obtenerAfiliado(affiliateId);
        if (!affiliate) return null;

        const referrals = this.loadReferrals().filter(r => r.affiliate_id === affiliateId);
        const commissions = this.loadCommissions().filter(c => c.affiliate_id === affiliateId);

        const totalPending = commissions
            .filter(c => c.status === 'pending')
            .reduce((sum, c) => sum + c.amount, 0);

        const totalPaid = commissions
            .filter(c => c.status === 'paid')
            .reduce((sum, c) => sum + c.amount, 0);

        const thisMonthCommissions = commissions
            .filter(c => {
                const commissionDate = new Date(c.created_at);
                const now = new Date();
                return commissionDate.getMonth() === now.getMonth() && 
                       commissionDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, c) => sum + c.amount, 0);

        return {
            affiliate,
            stats: {
                total_referrals: referrals.length,
                converted_referrals: referrals.filter(r => r.status === 'converted').length,
                total_commissions: affiliate.stats.total_commissions,
                pending_commissions: totalPending,
                paid_commissions: totalPaid,
                this_month_commissions: thisMonthCommissions
            },
            recent_referrals: referrals.slice(-10),
            recent_commissions: commissions.slice(-10),
            referral_links: {
                general: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}?ref=${affiliate.codigo}`,
                landing: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/landing?ref=${affiliate.codigo}`,
                demo: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/demo?ref=${affiliate.codigo}`
            }
        };
    }

    // Métodos auxiliares
    loadAffiliates() {
        try {
            return JSON.parse(fs.readFileSync(this.affiliatesFile, 'utf8'));
        } catch {
            return [];
        }
    }

    saveAffiliates(affiliates) {
        fs.writeFileSync(this.affiliatesFile, JSON.stringify(affiliates, null, 2));
    }

    loadReferrals() {
        try {
            return JSON.parse(fs.readFileSync(this.referralsFile, 'utf8'));
        } catch {
            return [];
        }
    }

    saveReferrals(referrals) {
        fs.writeFileSync(this.referralsFile, JSON.stringify(referrals, null, 2));
    }

    loadCommissions() {
        try {
            return JSON.parse(fs.readFileSync(this.commissionsFile, 'utf8'));
        } catch {
            return [];
        }
    }

    saveCommissions(commissions) {
        fs.writeFileSync(this.commissionsFile, JSON.stringify(commissions, null, 2));
    }
}

module.exports = AffiliateService;