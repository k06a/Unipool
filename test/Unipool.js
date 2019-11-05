const { BN, time } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const Uni = artifacts.require('UniMock');
const Snx = artifacts.require('SnxMock');
const Unipool = artifacts.require('UnipoolMock');

async function timeIncreaseTo (seconds) {
    const delay = 1000 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

const almostEqualDiv1e18 = function (expectedOrig, actualOrig) {
    const _1e18 = new BN('10').pow(new BN('18'));
    const expected = expectedOrig.div(_1e18);
    const actual = actualOrig.div(_1e18);
    this.assert(
        expected.eq(actual) ||
        expected.addn(1).eq(actual) || expected.addn(2).eq(actual) ||
        actual.addn(1).eq(expected) || actual.addn(2).eq(expected),
        'expected #{act} to be almost equal #{exp}',
        'expected #{act} to be different from #{exp}',
        expectedOrig.toString(),
        actualOrig.toString(),
    );
};

require('chai').use(function (chai, utils) {
    chai.Assertion.overwriteMethod('almostEqualDiv1e18', function (original) {
        return function (value) {
            if (utils.flag(this, 'bignumber')) {
                var expected = new BN(value);
                var actual = new BN(this._obj);
                almostEqualDiv1e18.apply(this, [expected, actual]);
            } else {
                original.apply(this, arguments);
            }
        };
    });
});

contract('Unipool', function ([_, wallet1, wallet2, wallet3, wallet4]) {
    describe('Unipool', async function () {
        beforeEach(async function () {
            this.uni = await Uni.new();
            this.snx = await Snx.new();
            this.pool = await Unipool.new(this.uni.address, this.snx.address);

            await this.snx.mint(this.pool.address, web3.utils.toWei('1000000'));
            await this.uni.mint(wallet1, web3.utils.toWei('1000'));
            await this.uni.mint(wallet2, web3.utils.toWei('1000'));
            await this.uni.mint(wallet3, web3.utils.toWei('1000'));
            await this.uni.mint(wallet4, web3.utils.toWei('1000'));

            await this.uni.approve(this.pool.address, new BN(2).pow(new BN(255)), { from: wallet1 });
            await this.uni.approve(this.pool.address, new BN(2).pow(new BN(255)), { from: wallet2 });
            await this.uni.approve(this.pool.address, new BN(2).pow(new BN(255)), { from: wallet3 });
            await this.uni.approve(this.pool.address, new BN(2).pow(new BN(255)), { from: wallet4 });

            this.started = (await time.latest()).addn(10);
            await timeIncreaseTo(this.started);
        });

        it('Two stakers with the same stakes wait 1 w', async function () {
            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.pool.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.pool.earned(wallet2)).to.be.bignumber.equal('0');

            await this.pool.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.pool.stake(web3.utils.toWei('1'), { from: wallet2 });

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.pool.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.pool.earned(wallet2)).to.be.bignumber.equal('0');

            await timeIncreaseTo(this.started.add(time.duration.weeks(1)));

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
        });

        it('Two stakers with the different (1:3) stakes wait 1 w', async function () {
            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.pool.balanceOf(wallet1)).to.be.bignumber.equal('0');
            expect(await this.pool.balanceOf(wallet2)).to.be.bignumber.equal('0');
            expect(await this.pool.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.pool.earned(wallet2)).to.be.bignumber.equal('0');

            await this.pool.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.pool.stake(web3.utils.toWei('3'), { from: wallet2 });

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.pool.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.pool.earned(wallet2)).to.be.bignumber.equal('0');

            await timeIncreaseTo(this.started.add(time.duration.weeks(1)));

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('54000'));
        });

        it('Two stakers with the different (1:3) stakes wait 2 weeks', async function () {
            //
            // 1x: +----------------+ = 72k for 1w + 18k for 2w
            // 3x:         +--------+ =  0k for 1w + 54k for 2w
            //

            await this.pool.stake(web3.utils.toWei('1'), { from: wallet1 });
            
            await timeIncreaseTo(this.started.add(time.duration.weeks(1)));

            await this.pool.stake(web3.utils.toWei('3'), { from: wallet2 });

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('72000'));
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('72000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('0'));

            await timeIncreaseTo(this.started.add(time.duration.weeks(2)));

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('90000'));
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('90000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('54000'));
        });

        it('Three stakers with the different (1:3:5) stakes wait 3 weeks', async function () {
            //
            // 1x: +----------------+--------+ = 18k for 1w +  8k for 2w + 12k for 3w
            // 3x: +----------------+          = 54k for 1w + 24k for 2w +  0k for 3w
            // 5x:         +-----------------+ =  0k for 1w + 40k for 2w + 60k for 3w
            //

            await this.pool.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.pool.stake(web3.utils.toWei('3'), { from: wallet2 });
            
            await timeIncreaseTo(this.started.add(time.duration.weeks(1)));

            await this.pool.stake(web3.utils.toWei('5'), { from: wallet3 });

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('54000'));

            await timeIncreaseTo(this.started.add(time.duration.weeks(2)));

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('26000')); // 18k + 8k
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('26000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('78000'));
            expect(await this.pool.earned(wallet3)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('40000'));

            await this.pool.withdrawAll({ from: wallet2 });

            await timeIncreaseTo(this.started.add(time.duration.weeks(3)));

            expect(await this.pool.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('38000')); // 18k + 8k + 12k
            expect(await this.pool.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('38000'));
            expect(await this.pool.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('0'));
            expect(await this.pool.earned(wallet3)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('100000'));
        });
    });
});
