'use strict'

import React from 'react'
import Reflux from 'reflux'
import Notification from 'react-notification'
import {Grid,Row,Col,Input,ButtonGroup,Button,Alert} from 'react-bootstrap'
import {LoanListItem, LoadingLoansPanel, BulkAddModal} from '.'
import a from '../actions'
import s from '../stores'
import InfiniteList from 'react-infinite-list'

var Search = React.createClass({
    mixins: [Reflux.ListenerMixin],
    getInitialState(){
        var filtered_loans = s.loans.syncFilterLoansLast()
        if (filtered_loans.length == 0)
            filtered_loans = s.loans.syncFilterLoans()
        var show_secondary_load = (kivaloans.secondary_load == 'started')
        return {filtered_loans, show_secondary_load, loan_count: filtered_loans.length, notification: {active: false, message: ''}}
    },
    componentDidMount() {
        //initial state works when flipping to Search after stuff is loaded. listenTo works when it's waiting
        //it should only fetch loans that are filtered.
        this.listenTo(a.loans.filter.completed, loans => {
            this.setState({filtered_loans: loans, loan_count: loans.length, })
            if (kivaloans.isReady()) {
                this.showNotification(`${loans.length} loans`)
                this.setState({hasHadLoans: true})
            }
        })
        //if we enter the page and loading loans is not done yet.
        this.listenTo(a.loans.load.completed, loans => a.loans.filter())
        this.listenTo(a.loans.load.secondaryLoad, this.secondaryLoad)
        this.listenTo(a.loans.load.secondaryStatus, this.secondaryStatus)
        this.listenTo(a.loans.load.backgroundResyncState, this.backgroundResyncState)
        a.utils.var.get('outdatedUrl', outdatedUrl => {
            if (outdatedUrl) {
                this.setState({outdatedUrl})
                window.rga.event({category: 'outdatedLink', action: 'redirect', label: outdatedUrl})
                a.utils.var.set('outdatedUrl', null) //todo: better with url state.
            }
        })
    },
    backgroundResyncState(backgroundResyncState){
        this.setState({backgroundResyncState})
    },
    secondaryStatus(status){
        this.setState({secondary_load_status: status})
    },
    secondaryLoad(status){
        if (status == 'started')
            this.setState({show_secondary_load: true})
        if (status == 'complete')
            this.setState({show_secondary_load: false})
    },
    showNotification(message){
        this.setState({notification: {active: true, message}})
    },
    changeCriteria(e){
        //e.preventDefault()
        //todo: scroll to criteria after it switches
    },
    bulkAdd(e){
        e.preventDefault()
        this.setState({showBulkAdd: true})
    },
    modalHidden(){
        //I hate this. this cannot be the right way to do this. it works. but there has to be a better way.
        this.setState({showBulkAdd: false})
    },
    render()  {
        var style = {height:'100%', width: '100%'}
        let {outdatedUrl, showBulkAdd, notification, show_secondary_load, backgroundResyncState, secondary_load_status, hasHadLoans, loan_count} = this.state
        return (
            <div style={style} >
                <If condition={showBulkAdd}>
                    <BulkAddModal onHide={this.modalHidden} />
                </If>
                <If condition={outdatedUrl}>
                    <Alert bsStyle="warning">
                        <p>
                            The link or bookmark you used is outdated. To ensure faster page loading and that you can
                            always get back to the right place, please bookmark this page.
                        </p>
                    </Alert>
                </If>
                <Col md={4}>
                    <Notification dismissAfter={5000} isActive={notification.active} message={notification.message} action={''} />
                    <ButtonGroup justified className="top-only">
                        <Button href="#" key={1} onClick={this.bulkAdd}>Bulk Add</Button>
                        <Button href="#/search" key={2} disabled={this.props.location.pathname == '/search'} onClick={this.changeCriteria}>Change Criteria</Button>
                    </ButtonGroup>
                    <If condition={show_secondary_load}>
                        <Alert className="not-rounded" style={{marginBottom:'0px'}} bsStyle="warning">
                            More loans are still loading. Carry on. {secondary_load_status}
                        </Alert>
                    </If>
                    <If condition={backgroundResyncState == 'started'}>
                        <Alert className="not-rounded" style={{marginBottom:'0px'}} >
                            Continue using the site while the loans are refreshed...
                        </Alert>
                    </If>
                    <If condition={hasHadLoans && loan_count == 0}>
                        <Alert className="not-rounded-top" style={{marginBottom:'0px'}} >
                            There are no matching loans for your current criteria. Loosen the criteria, select a
                            different Saved Search or click the "Clear" button to start over.
                        </Alert>
                    </If>
                    <LoadingLoansPanel/>
                    <InfiniteList
                        className="loan_list_container"
                        items={this.state.filtered_loans}
                        height={900}
                        itemHeight={100}
                        listItemClass={LoanListItem} />
                </Col>
                <Col md={8}>
                    {this.props.children}
                </Col>
            </div>
        )
    }
})

export default Search;