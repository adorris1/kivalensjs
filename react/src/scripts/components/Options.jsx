'use strict';

import React from 'react'
import Reflux from 'reflux'
import {Grid,Input,Row,Col,Panel,Alert,Button} from 'react-bootstrap'
import LinkedStateMixin from 'react-addons-linked-state-mixin'
import LocalStorageMixin from 'react-localstorage'
import {Link} from 'react-router'
import {KivaLink, NewTabLink, ClickLink, SetLenderIDModal} from '.'
import a from '../actions'
import {WatchLocalStorage} from '../api/syncStorage'
import extend from 'extend'

domready.done(function() { //unnecessary now that
    if (lsj.get("Options").useLargeLocalStorage)
        waitFor(()=>typeof LargeLocalStorage == 'function').done(r=> {
            window.llstorage = window.llstorage || new LargeLocalStorage({size: 125 * 1024 * 1024, name: 'KivaLens'})
        })
})

const Options = React.createClass({
    mixins: [Reflux.ListenerMixin, LinkedStateMixin, LocalStorageMixin],
    getInitialState(){ return { maxRepaymentTerms: 8, maxRepaymentTerms_on: false, missingPartners: [], showLenderModal: false } },
    getStateFilterKeys() {
        return ['maxRepaymentTerms', 'maxRepaymentTerms_on', 'kiva_lender_id', 'mergeAtheistList',
            'debugging', 'betaTester', 'useLargeLocalStorage', 'noStream', 'loansFromKiva', 'doNotDownloadDescriptions']
    },
    reload(){
        //this.setState(lsj.get("Options")) //this is messed up for lender_id, doesn't
    },
    componentDidMount(){
        this.listenTo(a.criteria.atheistListLoaded, this.figureAtheistStuff)
        //this.watcher = new WatchLocalStorage('Options', this.reload.bind(this))
        this.figureAtheistStuff()
    },
    figureAtheistStuff(){
        this.setState({atheist_list_processed: kivaloans.atheist_list_processed, missingPartners: this.getMissingPartners()})
    },
    componentDidUpdate(prevProps, {mergeAtheistList,useLargeLocalStorage}){
        //user just switched it on, after loans already loaded and list has not been downloaded yet, then process it.
        if (!mergeAtheistList && this.state.mergeAtheistList && !kivaloans.atheist_list_processed && kivaloans.isReady())
            kivaloans.getAtheistList()
        if (!useLargeLocalStorage && this.state.useLargeLocalStorage)
            waitFor(()=>typeof LargeLocalStorage == 'function').done(r=> {
                window.llstorage = window.llstorage || new LargeLocalStorage({
                        size: 125 * 1024 * 1024,
                        name: 'KivaLens'
                    })
            })
    },
    componentWillUnmount(){
        setDebugging()
    },
    showLenderIDModal(){this.setState({ showLenderModal: true })},
    hideLenderIDModal(){this.setState({ showLenderModal: false })},
    setLenderID(new_lender_id){ this.setState({kiva_lender_id: new_lender_id}) },
    getMissingPartners(){
        //get active partners without any score
        var m_partners = kivaloans.partners_from_kiva.where(p=>!p.atheistScore && p.status=='active')
        //look at the partner ids with loans, intersect them with partners without a score to be able to show which have loans.
        var m_p_with_loans = kivaloans.loans_from_kiva.select(loan => loan.partner_id).distinct().intersect(m_partners.select(p=>p.id))
        return m_partners.select(p => extend(true, {}, p, {kl_hasLoans: m_p_with_loans.contains(p.id) }))
    },
    render() {
        return (<Grid>
                <h1>Options</h1>
                <Col md={12}>
                    <Panel header="Speed!">
                        <Input
                            type="checkbox"
                            label={`I never search by Use or Description. Checking this option will prevent KivaLens from downloading the descriptions ahead of time for searching but you'll still be able to read the loan description when you click on a loan. This speeds up the initial load. Will only take effect next app load.`}
                            checkedLink={this.linkState('doNotDownloadDescriptions')} />
                        <Input
                            type="checkbox"
                            label="Do not subscribe to live data stream from Kiva (takes effect next app reload). Intended for tablet and smartphone users, this will dramatically reduce background processing and make your experience faster, however, your data won't be as fresh."
                            checkedLink={this.linkState('noStream')} />
                    </Panel>
                    <Panel header='Who are you?'>
                        {this.state.kiva_lender_id ?
                            <span>Your Lender ID: <b>{this.state.kiva_lender_id}</b> <ClickLink
                                onClick={this.showLenderIDModal}>Change</ClickLink></span>
                            : <Button onClick={this.showLenderIDModal}>Set Kiva Lender ID</Button> }
                        <SetLenderIDModal show={this.state.showLenderModal} onSet={this.setLenderID} onHide={this.hideLenderIDModal}/>
                        <p className="ample-padding-top">
                            This is used for:
                        </p>
                        <ul className='spacedList'>
                            <li><b>Excluding Fundraising Loans:</b> Fetches your loans from Kiva so it can remove
                                fundraising loans that are already in your portfolio to prevent accidentally
                                lending to the same borrower more than once.</li>
                            <li><b>Portfolio Balancing:</b> On the "Your Portfolio" Criteria tab, KivaLens will pull
                                public summary data of your portfolio for Partners, Countries, Sectors and Activities
                                so that you can exclude or include loans that match your criteria (ex: only find
                                Sectors that aren't like any in your total portfolio to collect them all
                                OR hide Partners that have more than 5% of your active portfolio
                                to balance your risk... and much more).</li>
                            <li><b>Basket Pruning:</b> By default, your basket will not clear when returning to the site.
                                If your Lender ID is set, when you come back to KivaLens, your completed loans
                                will be removed from your basket. If not set, you'll either need
                                to click the "Return to 3rd party app" at the end of your Kiva
                                checkout (which will clear your basket) or manually clear the basket when you come back.</li>
                            <li><b>Team Comparison:</b> On the "Teams" page, KivaLens will allow you to compare membership, loan count and total
                                lending on all of the teams you're on.</li>
                            <li><b>3D Loan Wall:</b> Once your lender-id is set, you can see your own&nbsp;
                                <a href="#/portfolio">3D Loan Wall</a> based off your portfolio.</li>
                        </ul>
                        <p>What this isn't:</p>
                        <ul className='spacedList'>
                            <li>
                                This does not log you in to Kiva. When you transfer your loans to Kiva,
                                you'll still have to log in to your account. As long as your profile is public, your
                                lender id is public information and can be seen by anyone on Kiva. It's not a secret.
                            </li>
                            <li>
                                This does not allow KivaLens to view any private information on your account.
                                KivaLens only pulls information publicly available, what's viewable from your lender page.
                                While it can know that you made a loan to a borrower, it does not know how much you
                                loaned or what team you attributed the loan to.
                            </li>
                        </ul>
                    </Panel>
                    <Panel header='External Research'>
                        <Input
                            type="checkbox"
                            label={`Merge Atheist Team's MFI Research Data for Secular and Social ratings`}
                            checkedLink={this.linkState('mergeAtheistList')} />
                        <p>
                            KivaLens pulls the <KivaLink path="team/atheists">Atheist Team</KivaLink>'s
                            MFI List from <NewTabLink href="https://docs.google.com/spreadsheets/d/1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0/edit#gid=1" title="View Google Doc">this Google Doc</NewTabLink> and
                            merges some of the data which allows you to search using their Secular (1-4)
                            and Social ratings (1-4) where a 1 represents a low score, so a 1 in the Secular Score
                            means that it is religion based. When activated, this will add 2 new sliders to the Partner
                            tab for Criteria and a section displaying and explaining the ratings to the Partner tab
                            of the loan. If a partner is not present in the MFI Research Data, it will pass by default.
                        </p>
                        <If condition={this.state.atheist_list_processed}>
                            <div><b>Partners not included in Atheist Data:</b>
                                <If condition={this.state.missingPartners.length==0}>
                                    <span> None</span>
                                </If>
                            <ul>
                                <For each='p' index='i' of={this.state.missingPartners}>
                                    <li key={i}>
                                        {p.id}: <KivaLink path={`partners/${p.id}`}>{p.name}</KivaLink>
                                        <If condition={p.kl_hasLoans}>
                                            <span> (Has loans loaded)</span>
                                        </If>
                                    </li>
                                </For>
                            </ul>
                            </div>
                        </If>
                    </Panel>
                    <Panel header='Debug/Beta Testing'>
                        <Input
                            type="checkbox"
                            label="Show me features that are being beta-tested (this option currently does nothing)"
                            checkedLink={this.linkState('betaTester')} />
                        <Input
                            type="checkbox"
                            label="Download loans from Kiva's server instead of KivaLens (only use this if experiencing problems; it's much slower!)"
                            checkedLink={this.linkState('loansFromKiva')} />
                        <Input
                            type="checkbox"
                            label={`When loading loans from Kiva (option above), allow me to start using the site after downloading all loans with ${this.state.maxRepaymentTerms} months before final repayment and less.`}
                            checkedLink={this.linkState('maxRepaymentTerms_on')} />
                        <input type="range" min={8} max={120}  valueLink={this.linkState('maxRepaymentTerms')}/>
                            This option only has an impact when loading loans from Kiva rather than KivaLens.
                            After the initial load of loans, the rest of the loans will get loaded so you'll still need to
                            use the final repayment date criteria option if you want to hide longer term loans.
                        <Input
                            type="checkbox"
                            label="Output debugging messages to the console"
                            checkedLink={this.linkState('debugging')} />
                    </Panel>

                </Col>
            </Grid>
        )
    }
})

/**
 * doesn't store partners currently. needs to be able to get partners from
 <Input
 type="checkbox"
 label="Store loans in my browser's database. This is used when opening multiple tabs or if opening KivaLens after navigating away relatively recently to prevent re-downloading. Not recommended for Safari users."
 checkedLink={this.linkState('useLargeLocalStorage')} />

 **/

export default Options;